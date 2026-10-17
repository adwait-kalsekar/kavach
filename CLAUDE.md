# Kavach project instructions

Read and follow [AGENTS.md](AGENTS.md). It is the canonical engineering instruction file for all agents; this file intentionally links to it rather than maintaining a second divergent ruleset.

Start with [the documentation index](docs/README.md), [architecture decisions](docs/architecture/README.md) and [backend foundation](docs/architecture/backend-foundation.md) and [web/RPC setup](docs/architecture/web-foundation.md).

Non-negotiable boundaries: browser service/API traffic → Hono only, with static assets served by the separate Nginx web service; shared runtime-validated API contracts; backend-owned sessions and cloud credentials; explicitly separate local SQLite from production Firestore; no fabricated observations or agronomic review claims. Update docs/diagrams with every architecture change and review each implementation batch before continuing. The UI foundation is React/Vite; GCP provisioning and farmer-facing screens remain deferred. Enforce type-only RPC imports, browser import/bundle guards, mutation headers and browser verification.

GCP setup: [owner steps](docs/deployment/gcp-setup.md), [delivery architecture](docs/architecture/gcp-deployment.md). Use plan-only bootstrap by default; live access is not yet configured. Keep production deploy disabled until bootstrap succeeds.

Deploy separate Cloud Run services (web 8081 / API 8080 internally; public HTTPS 443). Hono never serves the web build. Default run.app URLs enable health only; guest sessions require sibling custom domains, deferred by the owner. Keep exact credentialed CORS and CSRF, separate runtime identities, and test two-service restoration; rollout is not atomic.
