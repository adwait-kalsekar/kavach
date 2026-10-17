#!/usr/bin/env python3
"""One-time infrastructure setup. Default is an offline plan; --apply mutates GCP."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[2]


def settings(path):
    c = json.loads(Path(path).read_text())
    patterns = {
        "project": r"[a-z][a-z0-9-]{4,28}[a-z0-9]", "region": r"[a-z]+-[a-z]+\d",
        "service": r"[a-z][a-z0-9-]{0,30}[a-z0-9]", "artifactRepository": r"[a-z][a-z0-9-]{0,61}[a-z0-9]",
        "githubRepository": r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", "githubRepositoryId": r"\d+", "githubOwnerId": r"\d+",
    }
    for key, pattern in patterns.items():
        if not isinstance(c.get(key), str) or not re.fullmatch(pattern, c[key]):
            raise ValueError(f"Invalid {key} in settings file")
    if c.get("database") != "(default)":
        raise ValueError("This bootstrap manages only the default Firestore database; review named-database rules/IAM separately.")
    return c


def call(args, optional=False):
    result = subprocess.run(["gcloud", *args, "--quiet"], text=True, capture_output=True)
    if result.returncode:
        # Permission/network failures must never be mistaken for a missing resource.
        if optional and not re.search(r"PERMISSION_DENIED|permission denied|UNAUTHENTICATED", result.stderr, re.I) and re.search(r"\bNOT_FOUND\b|does not exist|was not found", result.stderr, re.I):
            return None
        raise RuntimeError(f"gcloud {' '.join(args[:4])} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def describe(args):
    text = call([*args, "--format=json"], optional=True)
    return json.loads(text) if text is not None else None


def rules_request(project, token, method, path, body=None):
    request = urllib.request.Request(f"https://firebaserules.googleapis.com/v1/projects/{project}/{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "X-Goog-User-Project": project}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == "GET":
            return None
        # Never print bearer credentials or request headers.
        raise RuntimeError(f"Firestore Rules API {method} {path} failed with HTTP {error.code}. Check Rules API permissions and project setup.") from None


def apply(c, use_existing_database=False):
    project, region = c["project"], c["region"]
    common = ["--project", project]
    info = json.loads(call(["projects", "describe", project, "--format=json"]))
    number = str(info["projectNumber"])
    billing = json.loads(call(["billing", "projects", "describe", project, "--format=json"]))
    if not billing.get("billingEnabled"):
        raise RuntimeError("Billing is not enabled. Link a billing account in the console, then rerun.")
    print(f"Applying reviewed setup to {project} ({number}), region {region}. No billing account or region is changed.")
    apis = ["run.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com", "firebaserules.googleapis.com",
            "iam.googleapis.com", "iamcredentials.googleapis.com", "sts.googleapis.com", "cloudresourcemanager.googleapis.com", "serviceusage.googleapis.com"]
    call(["services", "enable", *apis, *common])
    runtime = f"kavach-runtime@{project}.iam.gserviceaccount.com"
    deploy = f"kavach-deploy@{project}.iam.gserviceaccount.com"
    for name, email in [("kavach-runtime", runtime), ("kavach-deploy", deploy)]:
        if describe(["iam", "service-accounts", "describe", email, *common]) is None:
            call(["iam", "service-accounts", "create", name, *common, "--display-name", name])
    database = describe(["firestore", "databases", "describe", "--database=(default)", *common])
    if database is None:
        call(["firestore", "databases", "create", "--database=(default)", "--location", region, "--type=firestore-native", "--edition=standard", "--delete-protection", *common])
    elif not use_existing_database:
        raise RuntimeError("A Firestore database already exists. Inspect it first. Rerun with --use-existing-database only for this dedicated app database; this applies deny-all client rules and index/TTL settings.")
    elif database.get("locationId") != region or database.get("type") != "FIRESTORE_NATIVE":
        raise RuntimeError("Existing Firestore location/type differs from settings. Nothing will move or overwrite it; review settings first.")
    call(["projects", "add-iam-policy-binding", project, "--member=serviceAccount:" + runtime, "--role=roles/datastore.user", "--condition=None"])
    repository = c["artifactRepository"]
    registry = describe(["artifacts", "repositories", "describe", repository, "--location", region, *common])
    if registry is None:
        call(["artifacts", "repositories", "create", repository, "--location", region, "--repository-format=docker", "--labels=kavach-managed=bootstrap", *common])
    elif registry.get("format") != "DOCKER":
        raise RuntimeError("Artifact repository exists with a different format.")
    call(["artifacts", "repositories", "add-iam-policy-binding", repository, "--location", region, *common,
          "--member=serviceAccount:" + deploy, "--role=roles/artifactregistry.writer"])
    call(["iam", "service-accounts", "add-iam-policy-binding", runtime, *common,
          "--member=serviceAccount:" + deploy, "--role=roles/iam.serviceAccountUser", "--condition=None"])
    # Reserve the service/URL privately so CI needs service-scoped deploy permission only.
    service = describe(["run", "services", "describe", c["service"], "--region", region, *common])
    if service is None:
        call(["run", "deploy", c["service"], "--region", region, *common,
              "--image=us-docker.pkg.dev/cloudrun/container/hello", "--service-account", runtime,
              "--invoker-iam-check", "--no-allow-unauthenticated", "--min-instances=0", "--max-instances=3",
              "--cpu=1", "--memory=512Mi", "--labels=kavach-managed=bootstrap"])
    elif service.get("metadata", {}).get("labels", {}).get("kavach-managed") != "bootstrap":
        raise RuntimeError("An unrecognized Cloud Run service already uses this name. Refusing to take it over.")
    call(["run", "services", "add-iam-policy-binding", c["service"], "--region", region, *common,
          "--member=serviceAccount:" + deploy, "--role=roles/run.developer", "--condition=None"])
    pool, provider = "kavach-github", "github"
    if describe(["iam", "workload-identity-pools", "describe", pool, "--location=global", *common]) is None:
        call(["iam", "workload-identity-pools", "create", pool, "--location=global", "--display-name=Kavach GitHub", *common])
    workflow = c["githubRepository"] + "/.github/workflows/backend.yml@refs/heads/main"
    condition = (f"assertion.repository_id=='{c['githubRepositoryId']}' && assertion.repository_owner_id=='{c['githubOwnerId']}'"
                 f" && assertion.ref=='refs/heads/main' && assertion.workflow_ref=='{workflow}'"
                 f" && assertion.sub=='repo:{c['githubRepository']}:environment:production'"
                 " && assertion.event_name in ['push','workflow_dispatch']")
    mapping = "google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id"
    existing = describe(["iam", "workload-identity-pools", "providers", "describe", provider, "--workload-identity-pool", pool, "--location=global", *common])
    if existing is None:
        call(["iam", "workload-identity-pools", "providers", "create-oidc", provider, "--workload-identity-pool", pool,
              "--location=global", "--issuer-uri=https://token.actions.githubusercontent.com", "--attribute-mapping", mapping,
              "--attribute-condition", condition, *common])
    elif existing.get("attributeCondition") != condition or existing.get("oidc", {}).get("issuerUri") != "https://token.actions.githubusercontent.com" or existing.get("attributeMapping") != {"google.subject": "assertion.sub", "attribute.repository_id": "assertion.repository_id", "attribute.repository_owner_id": "assertion.repository_owner_id"}:
        raise RuntimeError("Existing WIF provider differs from this reviewed trust policy. Refusing to weaken or replace it.")
    principal = f"principalSet://iam.googleapis.com/projects/{number}/locations/global/workloadIdentityPools/{pool}/attribute.repository_id/{c['githubRepositoryId']}"
    call(["iam", "service-accounts", "add-iam-policy-binding", deploy, *common, "--member", principal,
          "--role=roles/iam.workloadIdentityUser", "--condition=None"])
    indexes = json.loads((ROOT / "infra/firestore.indexes.json").read_text())
    existing_indexes = json.loads(call(["firestore", "indexes", "composite", "list", "--database=(default)", *common, "--format=json"]))
    for index in indexes["indexes"]:
        group = index["collectionGroup"]
        expected = index["fields"]
        matches = [i for i in existing_indexes if f"/collectionGroups/{group}/" in i.get("name", "") and i.get("fields") == expected and i.get("queryScope") == index["queryScope"]]
        if matches:
            if matches[0].get("state") != "READY":
                raise RuntimeError("Required plan index is not READY. Wait and rerun before enabling deployment.")
        else:
            call(["firestore", "indexes", "composite", "create", "--database=(default)", *common, "--collection-group", group,
                  "--query-scope", index["queryScope"].lower().replace("_", "-"), *[f"--field-config=field-path={f['fieldPath']},order={f['order'].lower()}" for f in expected]])
    for field in indexes["fieldOverrides"]:
        args = ["--database=(default)", "--collection-group", field["collectionGroup"], *common]
        if field.get("indexes") == []:
            call(["firestore", "indexes", "fields", "update", field["fieldPath"], *args, "--disable-indexes"])
        if field.get("ttl"):
            call(["firestore", "fields", "ttls", "update", field["fieldPath"], *args, "--enable-ttl"])
    # Access token exists only in memory for these API calls; it is never output or saved.
    token = call(["auth", "print-access-token"])
    ruleset = rules_request(project, token, "POST", "rulesets", {"source": {"files": [{"name": "firestore.rules", "content": (ROOT / "infra/firestore.rules").read_text()}]}})
    release_name = f"projects/{project}/releases/cloud.firestore"
    release = {"name": release_name, "rulesetName": ruleset["name"]}
    if rules_request(project, token, "GET", "releases/cloud.firestore") is None:
        rules_request(project, token, "POST", "releases", release)
    else:
        rules_request(project, token, "PATCH", "releases/cloud.firestore", {"release": release, "updateMask": "rulesetName"})
    # Only the bootstrap operator changes public IAM access. CI remains run.developer.
    call(["run", "services", "update", c["service"], "--region", region, *common, "--no-invoker-iam-check"])
    output = {
        "GCP_PROJECT_ID": project, "GCP_PROJECT_NUMBER": number, "GCP_REGION": region,
        "GCP_ARTIFACT_REPOSITORY": repository, "GCP_CLOUD_RUN_SERVICE": c["service"], "FIRESTORE_DATABASE_ID": "(default)",
        "GCP_RUNTIME_SERVICE_ACCOUNT": runtime, "GCP_DEPLOY_SERVICE_ACCOUNT": deploy,
        "GCP_WORKLOAD_IDENTITY_PROVIDER": f"projects/{number}/locations/global/workloadIdentityPools/{pool}/providers/{provider}",
        "APP_ORIGIN": f"https://{c['service']}-{number}.{region}.run.app",
    }
    target = ROOT / "gcp-bootstrap-output.json"
    target.write_text(json.dumps(output, indent=2) + "\n")
    print(f"Setup complete. Non-secret GitHub configuration saved to {target.name}. The URL currently shows the public Google bootstrap page until CI deploys the tested Kavach application.")
    print(json.dumps(output, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=str(ROOT / "infra/gcp/settings.example.json"))
    parser.add_argument("--use-existing-database", action="store_true", help="Explicitly allow configuring an existing dedicated app database and replacing its client rules")
    parser.add_argument("--apply", action="store_true", help="Create/update the documented resources; billable GCP usage can result")
    args = parser.parse_args()
    c = settings(args.config)
    if not args.apply:
        print(json.dumps(c, indent=2))
        print("PLAN ONLY: no commands or GCP requests made. --apply enables APIs, creates identities/registry/database if absent, reserves a Cloud Run service and deliberately enables its public bootstrap page after setup, configures scoped IAM/WIF, indexes/TTL and deny-client rules. No keys are created. Existing database region/type and WIF policy mismatches stop setup. Billing must already be linked. Budgets and public-access organization policy need console review.")
        return
    apply(c, args.use_existing_database)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, subprocess.SubprocessError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
