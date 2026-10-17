# Kavach

Farmer seasonal-readiness copilot being developed for the Google Cloud AI Builder Cup. Start with the [visual product brief](docs/product/overview.html) and [documentation index](docs/README.md).

## Run the application

Requires Node.js 24 LTS (24.15+) and npm 12.2.0. No GCP project or credentials are needed locally.

```sh
npm ci
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open **http://localhost:3000**. The responsive workspace calls Hono directly on **http://localhost:8080/api/v1/health**, validates the response and lets you retry. `npm run dev` starts independent Vite and Hono processes and rebuilds shared packages. Keep API APP_ORIGIN=http://localhost:3000; exact CORS and CSRF protect requests.

`npm run build:app` builds both packages. `npm run start:api` starts only Hono, which serves no frontend assets. Production uses separate Cloud Run services: Nginx web on internal 8081 and Hono API on 8080, each with its own HTTPS hostname. See [web/RPC architecture](docs/architecture/web-foundation.md), [deployment decision](docs/architecture/gcp-deployment.md) and [container commands](infra/README.md).

The first default-URL deployment supports health only. Full guest journeys require sibling custom domains for reliable secure cookies; domain setup is deferred.

Implemented: guest ownership, farm context, immutable assessments, hypothetical comparisons, saved-plan tracking, optional weather adapter and SQLite/Firestore persistence. Workflow checks are explicitly unreviewed. Account login, AI conversations, reviewed agronomic advice and live GCP deployment are deferred.

## Verification

```sh
npm run build:app
npm run check:app
npm run test:api
npm run openapi:check
npm run test:firestore  # Java 21+, no GCP account
npx playwright install chromium
npm run test:e2e
```

[Infrastructure instructions](infra/README.md) cover the API container and future Cloud Run configuration. [Architecture and batch reviews](docs/architecture/backend-foundation.md) record current scope and verification limits.

## Workspace

`apps/web` is React/Vite with TanStack Router and Query. `apps/api` is Hono. The typed browser client uses Hono RPC plus runtime Zod validation; server code and SDKs stay out of the browser bundle. Farmer profile and readiness screens come next.

`apps/docs` remains the separate Next.js starter (`npm run dev:docs`); it is excluded from application development and GCP packaging. Root `docs/` is the canonical documentation.

Shared packages include contracts, a browser-safe API client, pure decision logic, and the original UI/lint/TypeScript configuration. Use [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) for engineering instructions.

## GCP setup

[Follow the project-specific Cloud Console/Cloud Shell guide](docs/deployment/gcp-setup.md). The workflow and rollback code are prepared, but deployment is disabled until GCP bootstrap and GitHub settings are complete. No service-account keys are required.
