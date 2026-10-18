# Kavach

Farmer seasonal-readiness copilot being developed for the Google Cloud AI Builder Cup. Start with the [visual product brief](docs/product/overview.html) and [documentation index](docs/README.md).

## Eight-hour submission handoff

**Start with [the deadline plan](docs/submission/README.md).** It contains local setup, the hour-by-hour build order, an agent prompt, the proposed public sample-demo contracts, Google-model/cloud setup, and the required deck/video/public-source checklist. The mobile voice-first sample and Google-model/speech integration are implemented and locally validated. See [current POC architecture](docs/architecture/poc-implementation.md); the first farmer-planning release has deployed, with UI refinements verified separately on each subsequent rollout. The deadline route avoids domain/auth work while preserving private API protection.

## Run the application

Requires Node.js 24 LTS (24.15+) and npm 12.2.0. No GCP project or credentials are needed locally.

```sh
npm ci
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open **http://localhost:3000** for **My situation → Compare → Next steps**. Select Latur, Beed or Nanded and chickpea, sorghum or wheat. Edit area, usable water and explicitly illustrative application assumptions; compare two areas and print a discussion sheet. The **Talk** tab supports typed chat, tap-to-speak/tap-to-finish questions and optional Google spoken replies grounded in the current inputs. Language and spoken-reply preferences last for the visit; inputs/chat clear on reload. Crop labels do not select a water dose. `/health` retains independent diagnostics. The browser calls Hono directly on **http://localhost:8080**. Default local mode supports deterministic calculations and dated historical context without cloud credentials; optional Google configuration enables AI/speech. Keep API APP_ORIGIN=http://localhost:3000.

`npm run build:app` builds both packages. `npm run start:api` starts only Hono, which serves no frontend assets. Production uses separate Cloud Run services: Nginx web on internal 8081 and Hono API on 8080, each with its own HTTPS hostname. See [web/RPC architecture](docs/architecture/web-foundation.md), [deployment decision](docs/architecture/gcp-deployment.md) and [container commands](infra/README.md).

The currently deployed foundation supports health. The new public sample works without guest cookies on default URLs after rollout. Private guest farms/plans still require sibling custom domains; domain setup is deferred.

Implemented: guest ownership, farm context, immutable assessments, hypothetical comparisons, saved-plan tracking, optional weather adapter and SQLite/Firestore persistence. Workflow checks are explicitly unreviewed. The new sample adds server-only Gemini, Google speech and a real NASA POWER historical snapshot. Account login, unrestricted agronomic advice and reviewed crop recommendations remain deferred. Contextual free-text and voice chat are implemented. The infrastructure and earlier main deployment are verified; this POC change is locally validated.

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

[Follow the project-specific Cloud Console/Cloud Shell guide](docs/deployment/gcp-setup.md). The project bootstrap and earlier foundation deployment are verified. The new farmer-planning experience requires the next verified main rollout. No service-account keys are required.
