# First GCP setup for Kavach

Project: **kavach-farmers-market-sense**. Region: **asia-south1 (Mumbai)**. The owner authorized setup and authenticated the local gcloud CLI on 18 October 2026. Bootstrap and the first CI deployment passed, with automatic main deployment enabled. The [web health foundation](https://kavach-web-62041733238.asia-south1.run.app) and [API health](https://kavach-api-62041733238.asia-south1.run.app/api/v1/health) are live. See the [live setup log](../architecture/backend-foundation.md#authorized-live-setup--18-october-2026) for acceptance details; the farmer demo and model remain unimplemented.

**Updated for independent web/API services. Discard the earlier combined-service setup ZIP and regenerate/download the current bundle.** The first deployment on two default Cloud Run URLs supports health only. The owner deferred the domain: guest farms/plans require later HTTPS sibling custom domains. Read [the serving and recovery decision](../architecture/gcp-deployment.md).

Use **Google Cloud Shell** for one-time setup. It already has gcloud and uses your Google login. After that, GitHub Actions uses short-lived federation; you need no service-account JSON key and no GCP credential on the Codex computer.

## 1. Select your project and enable billing

1. Open https://console.cloud.google.com/ and sign in with the Google account that owns this project.
2. Click the project selector beside the Google Cloud logo. Select **kavach-farmers-market-sense** by project ID, not just display name.
3. Open the navigation menu → **Billing**. If there is no linked account, choose **Link a billing account** and complete Google's process. Keep payment details private.
4. Search **Firestore** in the console. If a database already exists, note its ID and location. Do not delete or move it. Tell Codex before using it; region/type mismatches cause the script to stop.
5. If this project belongs to an organization, ask its administrator whether service-account creation, GitHub federation and a public Cloud Run site are permitted. Do not bypass organization policies.

The one-time operator needs administrative permissions to enable APIs and configure IAM/service accounts, WIF, registry, database/indexes/rules and Cloud Run public access. Use an existing authorized owner/admin account. The runtime and deployment identities created by the script never receive Owner/Editor.

## 2. Open Cloud Shell and check access

1. Click **Activate Cloud Shell** (`>_` near the console's top-right).
2. Wait for the terminal. Click **Authorize** if asked to allow Cloud Shell to use your account.
3. Run:

```sh
gcloud config set project kavach-farmers-market-sense
gcloud projects describe kavach-farmers-market-sense --format='value(projectId,projectNumber)'
```

You should see the project ID and a numeric project number. If denied, check your Google account and project permissions. A project ID alone grants no access. Never paste access tokens or login codes into chat.

## 3. Upload and preview the setup bundle

This GitHub repository is private. The supplied **kavach-gcp-setup.zip** lets you bootstrap without logging GitHub into Cloud Shell. It contains only setup/check scripts, non-secret project/repository settings, Firestore rules/indexes and this guide. Regenerate it from the repo with `python3 infra/gcp/make-bundle.py`; the output is `.data/kavach-gcp-setup.zip`.

1. Download the setup bundle from the Codex handoff.
2. In the Cloud Shell toolbar, choose **More (⋮) → Upload file**, select the ZIP, and upload to your home directory.
3. Run:

```sh
cd ~
unzip -q kavach-gcp-setup.zip
cd kavach-gcp-setup
python3 infra/gcp/check-access.py --project kavach-farmers-market-sense
python3 infra/gcp/bootstrap.py
```

The access check is read-only. Bootstrap without `--apply` prints the project, region, GitHub numeric IDs and intended changes, then exits without making GCP requests. Inspect those settings before proceeding.

## 4. Apply the reviewed setup

This command creates cloud resources and can incur charges. It does not link/change your billing account or move an existing database.

```sh
python3 infra/gcp/bootstrap.py --apply
```

The script:

- Enables required APIs.
- Creates Firestore Standard/Native in Mumbai if absent, with deletion protection, the plan index, large-field exclusions, expiry policies and deny-all browser/client rules.
- Creates separate API-runtime, web-runtime and deploy accounts. Only API runtime gets Firestore data access in this dedicated project. Web runtime gets no project data/provider permissions. Deploy gets registry write, Run Developer on both services and permission to attach both runtime identities.
- Creates GitHub OIDC federation restricted to the exact repository/owner numeric IDs, main, this workflow and the production environment. No service-account keys are created.
- Reserves two Cloud Run services privately with Google's hello container. At successful setup completion, the bootstrap operator deliberately enables public access. Each URL initially shows Google's placeholder page, **not Kavach**. The first tested CI rollout replaces it. CI has no IAM-policy editing permission.
- Writes **gcp-bootstrap-output.json** with only non-secret identifiers needed by GitHub.

The required composite query index must become READY before rollout. Field-index exemptions and TTL policies are submitted asynchronously and can remain pending after bootstrap exits; inspect Firestore operations/TTL status before claiming maintenance completion. Hono enforces expiry independently of eventual TTL cleanup. Keep Cloud Shell open while bootstrap runs. If setup fails, stop and share the error text with Codex. Do not give the runtime/deployer broad admin roles to make it pass. Never share tokens, key JSON or credential debug dumps.

On a Mac where Python lacks its default CA file, use the existing system CA bundle for this process, preserving TLS verification: `SSL_CERT_FILE=/etc/ssl/cert.pem python3 infra/gcp/bootstrap.py --apply --use-existing-database`. The existing-database flag is appropriate only after inspecting the dedicated app database, including when resuming after bootstrap created it. Never disable certificate verification.

If the script finds an existing database, inspect it first. Only if it is the dedicated Kavach default database in Mumbai and replacing its client rules with deny-all is intended, resume with:

```sh
python3 infra/gcp/bootstrap.py --apply --use-existing-database
```

That flag is also required when resuming after an earlier run created the database. A different database location/type, unrecognized service or different federation policy stops setup instead of being overwritten. Matching resources can be reused, but first-run cloud permissions and API behavior still need live verification.

After success:

```sh
cat gcp-bootstrap-output.json
```

Send that JSON back to Codex. It is safe to share here: there are no credentials in it. Alternatively, download just this file through Cloud Shell's file menu. Keep actual private credential files out of the upload/download flow.

## 5. Configure GitHub and trigger the first deployment

The earlier Codex GitHub connector returned **403 Resource not accessible by integration** for environment administration. On 18 October the owner's authenticated local `gh` CLI successfully created `production` with a main-only branch policy, so that connector limitation does not apply to this session. The steps below remain the manual alternative for future setup. Do not paste a GitHub token into chat.

### Owner-side GitHub console steps

1. Open https://github.com/adwait-kalsekar/kavach/settings/environments while signed in as the repository owner.
2. Click **New environment**, enter **production**, and click **Configure environment**.
3. Under **Deployment branches and tags**, choose **Selected branches and tags**. Add a **branch** rule named exactly **main**. Add no tag rule or wildcard. Do not select **No restriction**.
4. In this environment, find **Environment variables → Add environment variable**. For each of the 13 keys in `gcp-bootstrap-output.json`, add the name and its corresponding value. These are variables, not secrets. Keep the JSON handy; it contains the exact generated project number, identity/provider IDs and APP_ORIGIN.
5. Open https://github.com/adwait-kalsekar/kavach/settings/variables/actions → **New repository variable**. Name it **GCP_DEPLOY_ENABLED**, value **true**, only after bootstrap completes and the deployment code is merged to main. Keep it absent or false until then.
6. Optional: add environment reviewers if you want manual deployment approval. For automatic main deployments, leave that manual gate unset.
7. If GitHub says your private-repository plan does not support environments, stop and tell Codex. This design must be adjusted deliberately; do not make the repository public or weaken WIF trust as a workaround.

The 13 environment variable names are: GCP_PROJECT_ID, GCP_PROJECT_NUMBER, GCP_REGION, GCP_CLOUD_RUN_SERVICE, GCP_ARTIFACT_REPOSITORY, GCP_RUNTIME_SERVICE_ACCOUNT, GCP_DEPLOY_SERVICE_ACCOUNT, GCP_WORKLOAD_IDENTITY_PROVIDER, FIRESTORE_DATABASE_ID, APP_ORIGIN, API_ORIGIN, GCP_WEB_SERVICE and GCP_WEB_RUNTIME_SERVICE_ACCOUNT. APP_ORIGIN is the web address; API_ORIGIN is Hono. Do not put GCP_DEPLOY_ENABLED only in the environment: its gate must be readable as a repository variable.

### Optional CLI helper with sufficient GitHub access

The helper below works from a trusted computer with an authorized `gh` CLI identity that can administer deployment environments and Actions variables. It was successfully applied through the owner's local CLI on 18 October; a connector with narrower permissions may still require owner-side UI setup.

The helper previews without changes:

```sh
node infra/gcp/configure-github.mjs gcp-bootstrap-output.json
```

After bootstrap is verified, apply settings and enable automatic delivery:

```sh
node infra/gcp/configure-github.mjs gcp-bootstrap-output.json --apply --enable
```

It creates a **production** environment if absent, restricts its custom branch policy to main and sets non-secret settings. It refuses to overwrite differing environment protection or other branch policies, and leaves existing reviewers untouched. **GCP_DEPLOY_ENABLED=true** is a repository variable, so the job gate can evaluate it before entering the production environment. Until then, deployment is absent/disabled.

In GitHub, inspect **Settings → Environments → production** and **Settings → Secrets and variables → Actions → Variables**. For this solo POC, required environment reviewers are optional: enabling them pauses every deployment for approval. Protect main with successful **verify** checks and pull requests under **Settings → Branches**, or **Rules → Rulesets** in newer layouts. Private-repo plan restrictions may affect protection features; don't silently weaken cloud trust if a UI option is unavailable.

Once the code is merged to main, open **Actions → Application contracts and integration → Run workflow → main**. Later pushes/merges to main deploy after checks pass. Manual dispatch retries the current main; arbitrary branches and superseded commits cannot promote.

The workflow summary provides the public URL, commit, image digest, new revision and previous revision. Open the URL and confirm Kavach displays **API reachable**. This checks a validated API response; `/readyz` separately checks database readiness. The automated live smoke creates no synthetic production records. Owned-plan persistence across real revisions remains a separate acceptance check after sibling custom domains are configured. Default run.app URLs are distinct sites; cross-site guest endpoints intentionally reject requests instead of relying on third-party cookies.

## 6. Budget and operations

1. Open **Billing → Budgets & alerts → Create budget**.
2. Scope it to this project, choose a monthly amount you are comfortable with, and add alert thresholds such as 50%, 90% and 100%.
3. Check the notification recipients. Alerts-only budgets do not stop spending. Newer spend-cap budgets have service/account restrictions; do not assume a universal hard cap.
4. Open **Cloud Run → kavach-web / kavach-api → Revisions** for image/traffic history and **Logs** for runtime/request failures.
5. Initial settings per service are min instances 0, max 3, 1 CPU/512 MiB and request-based CPU billing. These are POC defaults, not measured cost guarantees; Firestore, images and logs have separate costs.
6. Configure Artifact Registry cleanup after reviewing rollback retention. Keep active and previous known-good digests available.

## Rollback and common errors

A candidate must become ready before it gets production traffic. Live checks then verify the actual desktop/mobile UI, expected release header, the exact web/API origin pair and database readiness. Failure restores the previous web and API revisions, attempting both restorations even if one fails. It fails the job and reports any manual recovery required. Two-service promotion/restoration is not atomic. Data changes are not rolled back.

For manual recovery, restore web first and then API: **Cloud Run → kavach-web / kavach-api → Revisions → Manage traffic**, assign 100% to each recorded last known-good revision from the previous successful workflow summary, and save. The initial Google hello revision is not a known-good application release.

- **No active gcloud account:** authorize Cloud Shell using the right Google account or configure a managed Codex GCP identity.
- **Billing disabled:** link billing in the console, then rerun.
- **Permission denied:** share the command/error; have an administrator review the setup operator's access. Never grant CI Owner/Editor.
- **Public access blocked:** an organization administrator may need to approve public hosting. CI cannot edit service IAM policy.
- **WIF denied:** allow IAM propagation, then check numeric repository/owner IDs, main, workflow path and production environment. Never replace the condition with `true`.
- **Attribute condition rejects this repository:** its verified subject is `repo:adwait-kalsekar@61903060/kavach@1421988948:environment:production`, using GitHub's immutable owner/repository IDs. A legacy name-only subject cannot match. Inspect `gh api repos/adwait-kalsekar/kavach/actions/oidc/customization/sub` and the live provider; only an authorized administrator should migrate a reviewed exact old subject, preserving all other checks. Do not disable immutable claims or accept wildcard subjects.
- **Index not READY:** wait for the build in Firestore indexes, then retry. Permission errors are not treated as missing resources.
- **Live smoke failure:** inspect workflow and Cloud Run logs; confirm the previous revision retained/regained traffic.

## Optional: direct GCP access from Codex

The official **gcloud 589.0.0** CLI is installed on the owner's Mac and available on PATH. The owner authenticated it on 18 October; read-only project/billing/IAM checks succeeded. Credentials remain in the CLI's external configuration, not in this repository. Installing a CLI alone does not grant access.

If Codex environment settings expose a **GCP connection/outbound identity**, configure an authorized identity there, review the permission scope and wait for its readiness status. Codex can select its supplied profile and use gcloud normally. Recheck using `infra/gcp/check-access.py`; project read access alone does not prove setup/deploy permissions.

With general environment secrets alone, a project ID or API key does not authorize deployment. `GOOGLE_APPLICATION_CREDENTIALS` expects a file path, not raw JSON, and ADC settings do not always configure gcloud's active account. Prefer managed short-lived credentials/profile configuration. Do not create a long-lived service-account key for this setup: Cloud Shell + GitHub WIF needs none.

The runtime uses its attached Cloud Run identity; GitHub has a separate short-lived deploy identity. No credentials belong in Vite settings, source control, browser bundles or image layers.

## Later: custom sibling domains

Keep both default run.app URLs for the health foundation. When you own a domain, plan `app.yourdomain` and `api.yourdomain` using a global external Application Load Balancer, two serverless NEGs, host rules and Google-managed certificates. Mumbai is not supported by preview direct Cloud Run domain mapping, which Google does not recommend for production. Load-balancer/DNS/certificate resources are not created by this bootstrap and have their own costs. No domain purchase or DNS changes are needed now.

After routing/certificates are verified, change the production APP_ORIGIN and API_ORIGIN variables to these exact HTTPS origins and deploy both services. Test Secure/HttpOnly/host-only guest cookies, valid and invalid CSRF, cross-owner denial and plan persistence in real desktop/mobile browsers before enabling farmer-facing forms. This remains a separate infrastructure acceptance batch.

## Voice-first POC provider configuration

The new implementation uses server-only `EXPLANATION_PROVIDER=google`, `GOOGLE_MODEL_ID=gemini-3.8-flash`, `GOOGLE_CLOUD_LOCATION=global` and `SPEECH_LOCATION=us`. Deployment config passes these explicitly to Hono, with these reviewed defaults when optional GitHub variables are absent. `configure-github.mjs` accepts the four optional non-secret variables alongside the original bootstrap output. Local defaults keep the provider disabled; `LOCAL_GCLOUD_AUTH=true` is an explicit local-only CLI-token mode and is rejected in production.

Bootstrap now enables Vertex AI, Speech-to-Text and Text-to-Speech and gives only the API runtime Vertex AI User, Speech Client and Service Usage Consumer, alongside its Firestore role. These APIs/grants were applied to the selected project during this authorized POC setup. Do not grant them to web or CI. The new demo cache TTL was verified ACTIVE; expiry checks are still enforced by the application. Actual attached Cloud Run model/speech calls must pass the next rollout's smoke check; local owner-credential calls are not proof of runtime identity access. See [POC architecture](../architecture/poc-implementation.md) for current implementation and validation.
