# Kavach

Farmer seasonal-readiness copilot being developed for the Google Cloud AI Builder Cup. Start with the [visual product brief](docs/product/overview.html) and [documentation index](docs/README.md).

## Eight-hour submission handoff

**Start with [the deadline plan](docs/submission/README.md).** It contains local setup, the hour-by-hour build order, an agent prompt, the proposed public sample-demo contracts, Google-model/cloud setup, and the required deck/video/public-source checklist. The mobile voice-first sample and Google-model/speech integration are implemented and locally validated. See [current POC architecture](docs/architecture/poc-implementation.md); the new sample has not yet been deployed. The deadline route avoids domain/auth work while preserving private API protection.

## Run the application

Requires Node.js 24 LTS (24.15+) and npm 12.2.0. No GCP project or credentials are needed locally.

```sh
npm ci
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open **http://localhost:3000** for the synthetic Latur/chickpea sample, water comparison and English/Hindi/Marathi interface. `/health` retains diagnostics. The browser calls Hono directly on **http://localhost:8080**. Local defaults provide deterministic checks and historical context; optional Google configuration enables voice and model explanations. `npm run dev` starts independent Vite and Hono processes and rebuilds shared packages. Keep API APP_ORIGIN=http://localhost:3000; exact CORS and CSRF protect requests.

`npm run build:app` builds both packages. `npm run start:api` starts only Hono, which serves no frontend assets. Production uses separate Cloud Run services: Nginx web on internal 8081 and Hono API on 8080, each with its own HTTPS hostname. See [web/RPC architecture](docs/architecture/web-foundation.md), [deployment decision](docs/architecture/gcp-deployment.md) and [container commands](infra/README.md).

The currently deployed foundation supports health. The new public sample works without guest cookies on default URLs after rollout. Private guest farms/plans still require sibling custom domains; domain setup is deferred.

Implemented: guest ownership, farm context, immutable assessments, hypothetical comparisons, saved-plan tracking, optional weather adapter and SQLite/Firestore persistence. Workflow checks are explicitly unreviewed. The new sample adds server-only Gemini, Google speech and a real NASA POWER historical snapshot. Account login, freeform AI conversations and reviewed agronomic advice remain deferred. The infrastructure and earlier main deployment are verified; this POC change is locally validated.

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

[Infrastructure instructions](infra/README.md) cover the API container and Cloud Run configuration. [Architecture and batch reviews](docs/architecture/backend-foundation.md) record current scope and verification limits.

## Workspace

`apps/web` is React/Vite with TanStack Router and Query. `apps/api` is Hono. The typed browser client uses Hono RPC plus runtime Zod validation; server code and SDKs stay out of the browser bundle. A bounded mobile sample journey is implemented; private farmer-profile and saved-plan interfaces remain deferred.

`apps/docs` remains the separate Next.js starter (`npm run dev:docs`); it is excluded from application development and GCP packaging. Root `docs/` is the canonical documentation.

Shared packages include contracts, a browser-safe API client, pure decision logic, and the original UI/lint/TypeScript configuration. Use [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) for engineering instructions.

## GCP setup

[Follow the project-specific Cloud Console/Cloud Shell guide](docs/deployment/gcp-setup.md). The workflow and rollback code are prepared, but deployment is disabled until GCP bootstrap and GitHub settings are complete. No service-account keys are required.
