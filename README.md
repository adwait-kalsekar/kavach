# Kavach

Farmer seasonal-readiness copilot being developed for the Google Cloud AI Builder Cup. Start with the [visual product brief](docs/product/overview.html) and [documentation index](docs/README.md).

## Run the application

Requires Node.js 24 LTS (24.15+) and npm 12.2.0. No GCP project or credentials are needed locally.

```sh
npm ci
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open **http://localhost:3000**. The responsive workspace calls Hono's real `/api/v1/health` endpoint, displays response timing, and lets you retry. `npm run dev` starts Vite and Hono together and rebuilds shared packages when they change. Vite proxies `/api` to Hono on port 8080; the browser makes no direct service requests.

To test the built app on one Hono origin:

```sh
npm run build:app
# Set APP_ORIGIN=http://localhost:8080 in apps/api/.env for this mode.
npm run start:api
```

Then open **http://localhost:8080**. The GCP container uses this same serving structure, with production Firestore configuration. See [web/RPC architecture](docs/architecture/web-foundation.md), [API guide](docs/api/README.md) and [environment example](apps/api/.env.example).

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
