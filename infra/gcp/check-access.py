#!/usr/bin/env python3
"""Read-only CLI check. Does not print tokens, credential contents or environment values."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--project", default="kavach-farmers-market-sense")
parser.add_argument("--identity-alias", help="Select a GCP connection from the non-secret Codex identity manifest")
args = parser.parse_args()
if not shutil.which("gcloud"):
    sys.exit("gcloud is not on PATH. Use Cloud Shell or install the official CLI before checking access.")
env = dict(os.environ)
if args.identity_alias:
    manifest_path = env.get("OIC_MANIFEST_PATH")
    if not manifest_path:
        sys.exit("No Codex identity manifest is configured; do not invent a connection alias.")
    manifest = json.loads(Path(manifest_path).read_text())
    if manifest.get("version") != 1:
        sys.exit("Unsupported identity manifest version.")
    candidates = [c for c in manifest.get("connections", []) if c.get("alias") == args.identity_alias and c.get("provider_kind") == "gcp"]
    if len(candidates) != 1:
        sys.exit("Selected GCP connection not found. Recheck environment readiness and connection alias.")
    selected = candidates[0]
    for key, field in [("CLOUDSDK_CONFIG", "config_dir"), ("CLOUDSDK_ACTIVE_CONFIG_NAME", "configuration_name"), ("GOOGLE_APPLICATION_CREDENTIALS", "credentials_file")]:
        if not selected.get(field):
            sys.exit("GCP connection selector is incomplete. Recheck environment setup.")
        env[key] = selected[field]
result = subprocess.run(["gcloud", "projects", "describe", args.project, "--format=json"], env=env, capture_output=True, text=True)
if result.returncode:
    print("GCP access is not verified. The CLI could not describe the selected project. Configure an authorized cloud connection or run this check in Cloud Shell.", file=sys.stderr)
    # Print only the first human error line, never stdout/credentials or full debug output.
    for line in result.stderr.splitlines():
        if line.startswith("ERROR:"):
            print(line, file=sys.stderr)
            break
    sys.exit(1)
info = json.loads(result.stdout)
print(json.dumps({"projectId": info["projectId"], "projectNumber": info["projectNumber"], "projectReadAccess": True, "note": "Read access does not prove bootstrap or deployment IAM permissions."}, indent=2))
