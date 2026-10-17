# Stack and GCP deployment decision

Selected 17 October 2026. This is the implementation target, not a claim that it has been built or deployed. See [implementation plan](implementation-plan.md).

Current implementation status: [backend foundation](backend-foundation.md) and [API guide](../api/README.md). The backend and React/Vite health screen are implemented; farmer-facing screens and AI remain targets. [Web/RPC setup](web-foundation.md) defines the type-only server contract exception to the general ban on browser imports from API modules. Local development defaults to durable SQLite with an optional Firestore emulator; production remains Firestore. Account login is deferred behind Hono-managed guest ownership. The generated [OpenAPI specification](../api/openapi.json) is authoritative for current HTTP payloads.

## API framework: Hono on Node.js

Both Hono and Express are deployable to Cloud Run. Google documents an Express-based Node deployment, and Hono documents its own Cloud Run deployment using the Node adapter. Cloud Run accepts a compatible HTTP container; it does not require Express. [Google Node quickstart](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service), [Hono Cloud Run guide](https://hono.dev/docs/getting-started/google-cloud-run).

Choose Hono because this is a new TypeScript API with clear validation, middleware and test boundaries. Its request testing and streaming helpers fit our proposed workflows. This is a project-fit decision, not a claim that Hono has superior GCP hosting or measured performance. Do not continue framework comparisons during implementation. [Hono testing](https://hono.dev/docs/guides/testing), [streaming](https://hono.dev/docs/helpers/streaming).

Use `@hono/node-server`, Node.js 24 LTS, a validated environment configuration and a reusable SDK client per process. Listen on `0.0.0.0` and the injected `PORT`; implement graceful SIGTERM shutdown. Keep durable state outside the container and avoid untracked background work after HTTP responses. [Cloud Run runtime contract](https://cloud.google.com/run/docs/container-contract).

## Frontend and workspace

React + Vite, TanStack Router, TanStack Query, shared Zod contracts, Tailwind CSS and accessible UI primitives. Keep npm workspaces/Turborepo. Router handles routes and loading coordination; Query owns server-state caching; local forms own drafts. Do not introduce a second authoritative assessment cache in route loaders.

The frontend is a browser application. It connects only to the Hono application origin. Domain logic, credentials, authentication-provider integrations, provider SDKs and Firestore Admin SDK remain server-side. Support route-level code splitting, readable low-bandwidth/loading states and narrow mobile layouts. SSR and search-engine indexing are not requirements of the first farmer workflow.

## Deployment topology

```text
Browser
  └─ HTTPS + HTTP-only session cookie: one Hono/Cloud Run origin
       ├─ /assets/* and frontend GET routes → built Vite assets
       ├─ /api/v1/* → Hono API (server session validation + ownership)
       ├─ /healthz → process liveness
       └─ /readyz → bounded readiness checks
                ├─ Firestore: sessions, profiles, plans, evidence metadata
                ├─ Vertex AI: Gemini
                └─ External public-data adapters: weather etc.
```

Separate apps in the repository, one deployable container initially. Build Vite assets and compiled backend independently, then copy outputs into a small non-root Node runtime image. The Hono server serves the frontend artifacts. Local Vite proxies `/api` to the backend; production uses the same relative API URL. This avoids a second deployment and cross-origin session configuration for the POC.

Register API routes and API JSON 404/error handling before frontend handling. Missing assets must return 404, never `index.html`. Only eligible frontend GET/HEAD routes with an HTML accept header receive the SPA fallback. Non-GET unknown paths remain 404/405. Hash-named assets can be immutable; `index.html`, identity responses and personal API responses must not be publicly cached.

The browser-facing origin remains Hono under the user's boundary requirement. Static hosting separation would require an explicit future architecture change; it is not the default growth step. No Kubernetes, Redis, load balancer, separate worker service or API Gateway is required for the initial flow.

All application data/file/audio requests go through Hono: no direct Firebase SDK calls, Vertex/Gemini clients, weather URLs, signed GCS upload/download URLs, remote telemetry or realtime database subscriptions in the browser. Self-host fonts/icons and frontend assets. Set CSP `connect-src 'self'` and other resource directives consistent with the same-origin boundary; use blob media only for locally recorded/generated playback where needed. Source references may be rendered as text; an in-app evidence view is fetched through Hono. A document fetch must resolve a server-approved source ID, not proxy an arbitrary user URL.

## Database: Firestore Standard / Native mode

The main access patterns are document-oriented: get a farm, create an immutable assessment, list that owner's saved plans, retrieve evidence by ID and append conversation messages. Choose Firestore for these patterns and low operational setup, rather than Cloud SQL's connection/pool/migration work. Cloud SQL is supported on Cloud Run; it is simply not required by the initial data model. [Firestore structure guidance](https://firebase.google.com/docs/firestore/manage-data/structure-data), [Cloud SQL connectivity](https://cloud.google.com/sql/docs/postgres/connect-run).

This choice supports expansion while the access patterns remain suitable. Large analytical joins and raw geospatial history belong in a later analytical pipeline, not giant Firestore documents. BigQuery, Earth Engine processing and Cloud Storage are added for demonstrated data needs, not required merely to start the application.

### Initial collections

| Collection      | Purpose and access pattern                                                         |
| --------------- | ---------------------------------------------------------------------------------- |
| `sessions`      | Hashed opaque session token, server-derived owner, expiry and revocation           |
| `farms`         | Owner-scoped confirmed context, schema version and revision                        |
| `assessments`   | Immutable context/evidence/rule snapshot; owner + creation-time listing            |
| `plans`         | Owner-scoped saved assessment reference and mutable task-state revision            |
| `conversations` | Owner, confirmed farm/assessment context and timestamps                            |
| `messages`      | Separate bounded records by conversation, owner and creation time                  |
| `evidence`      | Immutable normalized evidence metadata and bounded values; source/product versions |
| `regionPacks`   | Published immutable crop/district guidance version metadata                        |
| `providerCache` | Bounded reusable provider result keyed by request, source/version and expiry       |
| `operations`    | Owner-scoped idempotency/reservation records for side-effectful requests           |

Use generated IDs, bounded/paginated queries and committed composite indexes for implemented access patterns. Store long text, transcripts and evidence payloads without unnecessary automatic indexes. Keep each document bounded; no ever-growing conversation arrays. Respect the documented 1 MiB document maximum. Store large licensed artifacts in Cloud Storage when needed and reference them. [Firestore limits](https://firebase.google.com/docs/firestore/quotas).

### Expiration and retention

Use an application-enforced `expiresAt` for temporary caches and operation records. Firestore TTL provides eventual cleanup: expired documents can remain readable until deletion, usually within 24 hours; parent TTL does not delete child subcollections. Never depend on TTL to decide whether data is usable or authorization is valid. Do not expire saved assessment history by default. Define any user-data retention policy separately. [Firestore TTL behavior](https://firebase.google.com/docs/firestore/ttl).

### Access

Use a dedicated Cloud Run runtime service account and Application Default Credentials. Browser Firestore access is denied; Hono validates its session cookie and enforces ownership on every operation, including nested message reads and downloads. Firestore server SDKs bypass Security Rules, so server authorization and IAM are necessary even with deny-all client rules. [Firestore server-access distinction](https://firebase.google.com/docs/firestore/security/rules-conditions), [Cloud Run service identity](https://cloud.google.com/run/docs/configuring/services/service-identity).

For the POC, Hono creates a guest owner and a cryptographically random opaque session (at least 256 bits of randomness). Store only a hash of the token in Firestore; send the token in a production `__Host-` cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` and no Domain attribute. Enforce expiry/revocation in application code independently of TTL cleanup, use a bounded lifetime, and provide session deletion. Local HTTP development uses an explicitly development-only cookie configuration. Identity/auth library selection is an implementation detail, not permission to hand-roll cryptography.

Validate exact allowed Origin and a CSRF token on mutating browser requests, including session creation; use no wildcard credentialed CORS. Bound session creation and per-owner paid operations across instances. Guest sessions do not provide account recovery or cross-device access. Never trust an `ownerId` supplied by the browser. Future login must preserve the browser → Hono boundary; do not add a browser auth provider SDK without changing the architecture decision. Publicly invokable Cloud Run does not grant access to private API records.

## GCP service inventory

| Service                     | Initial responsibility                                        |
| --------------------------- | ------------------------------------------------------------- |
| Cloud Run                   | Web assets and Hono API container                             |
| Artifact Registry           | Versioned container images                                    |
| Cloud Build                 | Build/verification/publish pipeline once project setup exists |
| Firestore Standard / Native | Operational data                                              |
| Vertex AI                   | Gemini inference with workload credentials                    |
| Cloud Logging / Monitoring  | Structured operational visibility                             |
| Secret Manager              | Only provider credentials that actually need stored secrets   |

Use SDK Application Default Credentials for Vertex AI. Keep model ID/location configurable and verify actual project access, supported structured output/tools and quota before selecting the model. No downloaded service-account key should be committed or baked into the image. [Google AI authentication](https://cloud.google.com/vertex-ai/generative-ai/docs/start/gcp-auth), [Cloud Run secret integration](https://cloud.google.com/run/docs/configuring/services/secrets).

Working region preference: `asia-south1` (Mumbai) for Cloud Run and Firestore, subject to the user's eventual project constraints. Firestore supports Mumbai and its database location cannot be changed after creation. Verify the chosen Vertex model's region separately; do not assume all services/model versions share availability. [Firestore locations](https://cloud.google.com/firestore/native/docs/locations), [Cloud Run locations](https://cloud.google.com/run/docs/locations).

## Deployment readiness checklist

- User supplies project later; check billing, enabled APIs and service availability then.
- Pin build/runtime/package versions; use the committed lockfile and a reproducible container build from the monorepo root.
- Separate build/deploy permissions from runtime IAM. Runtime gets only the needed database/model/secret access.
- Provision Firestore/indexes and backend session configuration; configure allowed origin, CSRF protection and deny browser database access.
- Verify authenticated API calls through the deployed URL, cold restart persistence and isolation between two users.
- Configure resource limits, request deadlines and max instances based on a small measured load test. Scale limits and budgets are guardrails, not a guaranteed hard spending cap.
- Use bounded per-user quotas that work across instances; process-local rate limiting is only supplemental.
- Verify deep links, static asset caching, AI streaming/cancellation if implemented, degraded data behavior and rollback to a previous image.
- Capture browser requests during the complete flow; all application network traffic must target the Hono origin, including auth, file/audio access and streaming.
- Label replay fixtures in the interface. Submission flow must use actual Google AI and deployed API/persistence; no silent fixture fallback.
