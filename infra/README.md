# Infrastructure preparation

These are reviewable templates, not deployed infrastructure. No GCP project is required for the default SQLite API or Firestore emulator tests. See [API guide](../docs/api/README.md) and [architecture](../docs/architecture/backend-foundation.md).

## Local

- `firebase.json`: Firestore emulator on loopback 8085, no emulator UI.
- `firestore.rules`: deny direct client access. Server SDKs still use IAM and API ownership checks.
- `firestore.indexes.json`: saved-plan history index, large-field index exclusions and TTL cleanup fields. The adapter writes `expiresAt` as a Firestore Timestamp and converts it back to ISO in application records.
- Default local persistence is `.data/kavach.sqlite`. Session/operation/quota expiry is enforced by the application; SQLite has no automatic TTL sweeper in this version. Remove the local data file to reset development records. Never use it as deployed persistence.

## Container and GCP later

Build from the repo root: `docker build -f infra/Dockerfile.api -t kavach-api .`. The image separately builds React/Vite and Hono, serves built web assets through Hono, installs only production API dependencies into the final image, and runs as a non-root user and refuses startup until valid production Firestore/project/origin settings are supplied.

For networks with a private certificate authority, the Dockerfile accepts an optional BuildKit secret: `--secret id=npm_ca,src=/path/to/ca.pem`. Supply proxy build arguments through the build environment when required. The CA is mounted only during build steps and is not copied into the image; TLS verification stays enabled. Normal GCP/CI builds need no extra CA.

Run `node infra/tests/container-smoke.mjs kavach-api` after building to verify web HTML/assets/CSP, typed health, HTTP session/farm/assessment/plan creation and restart persistence. This explicitly overrides the production image into SQLite local mode for the test; production remains Firestore.

`cloudbuild.yaml` builds and publishes an image; it neither deploys Cloud Run nor creates Firestore. An Artifact Registry repository and appropriate build identity must already exist. `cloudrun-service.example.yaml` is a template with explicit placeholders. Replace project, image digest, runtime service account and exact HTTPS origin before applying it. Initial resource settings are a small POC starting point, not load-tested sizing.

When project setup is available:

1. Select the database region before creating Firestore; locate Cloud Run near it. Verify resource availability in the actual project.
2. Enable required APIs and create Artifact Registry, Firestore Standard/Native and a dedicated runtime service account. Grant database access through the narrow role needed by this server; build/deploy identity stays separate.
3. Publish rules/indexes/TTL definitions deliberately. Server sessions require expiry checks even before TTL cleanup happens.
4. Build/push and deploy the reviewed image with APP_ENV=production, STORAGE_BACKEND=firestore, GOOGLE_CLOUD_PROJECT and exact APP_ORIGIN. Leave emulator/local credential-file settings unset. Account login and AI are still unavailable in this batch. Hono serves the built React/Vite workspace and the API on the same origin.
5. Verify the real URL, IAM, indexes, secure cookies, owned-plan persistence across restart, cross-owner denial and rollback. Confirm any future provider usage terms before enabling it.

Live Cloud Run deployment, production IAM/index enforcement and actual model inference are not proven by local/emulator tests.
