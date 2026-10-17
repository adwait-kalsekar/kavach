# Infrastructure preparation

No GCP account is needed for local SQLite or Firestore emulator tests. [Architecture and recovery](../docs/architecture/gcp-deployment.md) and [owner setup](../docs/deployment/gcp-setup.md) record the active two-service design. Hono never serves React output.

## Independent runtime images

From the repo root:

```sh
docker build -f infra/Dockerfile.api --target builder -t kavach-builder .
docker build -f infra/Dockerfile.api -t kavach-api .
docker build -f infra/Dockerfile.web -t kavach-web .
node infra/tests/container-smoke.mjs kavach-api
node infra/gcp/test-live-smoke.mjs kavach-api kavach-web
```

The shared builder uses the Turbo graph. The API runtime has production Node dependencies and compiled API/contracts/domain. The web runtime has Nginx and static assets only. Both are non-root. API listens on internal 8080, web on 8081, configured through PORT. Each Cloud Run service exposes its own HTTPS URL on 443. Nginx uses API_ORIGIN for public runtime config and exact CSP; Hono uses APP_ORIGIN for exact frontend CORS and CSRF. No API proxy exists on the web service.

For a network using a private CA, pass `--secret id=npm_ca,src=/path/to/ca.pem` to API/builder builds and preserve configured proxy arguments. The CA is mounted only for npm steps, not copied into images. TLS verification stays enabled. Normal GCP/CI builds need no extra CA.

The API smoke overrides production settings to explicit local SQLite, creates owned resources and checks restart persistence. The two-container smoke exercises real Nginx, direct browser API health, exact origin boundaries, CSP, expected release headers and API outage/recovery with web availability. It does not verify real cloud IAM or cookie behavior under custom domains.

## Local data and Firestore

- `firebase.json`: loopback Firestore emulator on 8085, no emulator UI.
- `firestore.rules`: deny direct browser/client access; server SDK access uses IAM and Hono ownership checks.
- `firestore.indexes.json`: plan-history index, field exclusions and TTL cleanup. Expiry is still enforced before TTL deletion.
- SQLite `.data/kavach.sqlite` is local only, with no automatic TTL sweeper. Production rejects SQLite and emulator/credential-file configuration.

## GCP delivery

`infra/gcp/bootstrap.py` defaults to an offline plan, reserves web/API services and configures separate runtime identities, registry, database/indexes/TTL/rules and constrained GitHub WIF only with --apply. Only API runtime has Firestore permission. No live setup has run. Regenerate the Cloud Shell bundle after changes with `python3 infra/gcp/make-bundle.py`; old combined-service bundles are obsolete.

GitHub Actions verifies and smoke-tests both images, transfers those exact artifacts, pushes immutable digests, stages ready candidates and promotes API then web. Live checks verify both releases. Failure restores web then API, with manual recovery reporting. This is coordinated deployment, not an atomic two-service transaction; retain previous-client compatibility. `cloudbuild.yaml` builds/pushes both images only and must not become a second deploy controller.

`cloudrun-service.example.yaml` and `cloudrun-web.example.yaml` are templates, not applied infrastructure. Replace identities, image digests, project and exact origins. Default URLs support health only; same-site custom domains are required before releasing the guest journey. Domain/load-balancer infrastructure remains deferred. See the owner guide before enabling the main deployment gate.
