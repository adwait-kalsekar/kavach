# Cloud and model: first-hour runbook

**Current status (18 October 2026):** Google adapters and the bounded sample journey are implemented and locally exercised. See [current POC architecture](../architecture/poc-implementation.md) for provider IDs, regions, grants, voice flow and verified limits. The new POC release has not yet been deployed.

Project: `kavach-farmers-market-sense`. On 18 October 2026 the owner authenticated the local gcloud CLI and authorized provisioning. Bootstrap completed and GitHub deployment is enabled; first-rollout acceptance is recorded in the [live setup log](../architecture/backend-foundation.md#authorized-live-setup--18-october-2026). No live Google-model response is claimed yet. Never send credentials through chat.

## 1. Local login and one real model response

Install the official [Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install). Use your authorized account. CLI login and SDK Application Default Credentials are separate:

```sh
gcloud auth login
gcloud config set project kavach-farmers-market-sense
gcloud auth application-default login
gcloud auth application-default set-quota-project kavach-farmers-market-sense
python3 infra/gcp/check-access.py --project kavach-farmers-market-sense
```

Cloud Shell normally already has an authorized CLI login. These commands are for the owner; ADC files remain in the user's standard gcloud configuration directory outside Git. Do not copy JSON keys into the repository or set production GOOGLE_APPLICATION_CREDENTIALS.

In Console search **Vertex AI** (Google's current docs also use Gemini Enterprise Agent Platform terminology), enable the API, open the model catalog/Studio and choose a text-generation Gemini Flash model available to this project. Record the actual model ID and a supported location. Prefer a stable model available now; don't choose image/preview models merely because a tutorial uses them. Check [current locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations); `global` is an option only when supported and is not a promise that requests remain in Mumbai.

Authorized setup operator:

```sh
gcloud services enable aiplatform.googleapis.com --project=kavach-farmers-market-sense
```

Use the included diagnostic. It defaults to an offline plan; --run makes one **billable**, tiny model request with your active gcloud identity. Replace MODEL_ID with the verified model ID, without angle brackets:

```sh
python3 infra/gcp/check-gemini.py --model MODEL_ID --location global
python3 infra/gcp/check-gemini.py --model MODEL_ID --location global --run
```

Success proves the CLI identity can call that exact model/location, **not** that the deployed API runtime can. It prints only safe metadata and the smoke marker status, never the access token. It does not create a model API endpoint in Hono. A 403 needs API/IAM/policy review; 404 usually requires checking model/location; 429 needs quota/capacity investigation. Don't hide these by selecting a fixture adapter. Record the tested identity type, model, location and time in the final handoff.

## 2. Existing GCP hosting foundation

Follow [the project-specific console/Cloud Shell guide](../deployment/gcp-setup.md). Bootstrap is plan-only by default; --apply is an owner-run, billable infrastructure operation. It creates Firestore/registry/identities/WIF and two Cloud Run services. Preserve existing database location and inspect any existing resources before applying. Regenerate the current bundle if using Cloud Shell:

```sh
python3 infra/gcp/make-bundle.py
```

The ZIP under `.data/` contains setup files, the model probe and guides; it does not include private credentials or the application's database. Follow the guide to configure the main-only GitHub production environment and 13 existing non-secret variables. These were configured through the owner's authorized local `gh` CLI on 18 October; owner UI setup remains an alternative when a connector lacks environment administration. Verify the existing health foundation deploys early; the initial Google hello containers are placeholders, not the prototype.

## 3. Authorize only the API runtime for model use

After bootstrap creates `kavach-runtime`, an authorized operator can grant its project-level inference role in this dedicated application project:

```sh
gcloud projects add-iam-policy-binding kavach-farmers-market-sense \
  --member=serviceAccount:kavach-runtime@kavach-farmers-market-sense.iam.gserviceaccount.com \
  --role=roles/aiplatform.user --condition=None
```

Do not grant this to web runtime or the GitHub deployer. Keep public frontend hosting unprivileged. The attached API service account provides ADC at runtime. The standard role is practical for this POC; inspect organization policy and actual permission failures rather than granting Owner/Editor.

## 4. Wire model configuration through code and CI

These are **proposed settings to implement**, not working flags in the current app:

```dotenv
EXPLANATION_PROVIDER=google
GOOGLE_CLOUD_PROJECT=kavach-farmers-market-sense
GOOGLE_CLOUD_LOCATION=global
GOOGLE_MODEL_ID=REPLACE_WITH_VERIFIED_MODEL_ID
DEMO_AI_REQUESTS_PER_MINUTE=10
DEMO_AI_REQUESTS_PER_DAY=100
```

Implement their validation in API config/composition; select the disabled provider by default. GOOGLE_CLOUD_PROJECT already exists for Firestore. Add the new configuration names to `.env.example` only with the adapter implementation. Add corresponding non-secret production variables, explicitly pass them into the workflow deploy job, validate them in deploymentConfig and serialize them into the **API service's** env-vars-file in deploy.mjs. The web service receives only its public API origin/release SHA. Update tests and the strict GitHub-config helper if extending its allowlist: it currently accepts exactly the 13 bootstrap settings, so do not feed it an augmented JSON object unchanged.

Important: the deploy helper replaces environment settings from its explicit file. Setting a model variable manually in Cloud Run Console without updating code can be lost on the next push. A model configured in local .env does not configure CI or Cloud Run. No model/provider secret goes into Vite or runtime-config.js.

## 5. Prove the actual public prototype

After the model/demo code is implemented and validated, merge/push main and let the existing verified-image pipeline deploy both services. Do not turn on a separate Cloud Build deploy trigger. Keep the existing public run.app URLs; no domain/SSL/load-balancer work is on this sprint's critical path.

Extend live smoke beyond health: open the web address in an incognito desktop/mobile browser, run the sample assessment, change irrigation, request the actual Google explanation, and inspect model/version/time/cached metadata. Confirm the demo sends no guest cookies, needs no Google login, and only web/Hono origins appear in its network requests. Default-URL private guest routes must remain blocked cross-site.

The initial live model diagnostic used an owner identity; this final test must exercise **Hono using the attached runtime identity**. Keep a disabled-model test locally and an actual provider failure check so an outage produces honest UI failure, not fake success. If rollout/live acceptance fails, restore previous traffic with the existing runbook; do not weaken security or serve SQLite in production.

## Sources checked 18 October 2026

- [Official Google Gen AI JavaScript SDK](https://googleapis.github.io/js-genai/release_docs/index.html)
- [Google model quickstart / current REST endpoint](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal)
- [Model locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)
- [Function calling, if added later](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling)
