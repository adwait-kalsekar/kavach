# Kavach

Farmer seasonal-readiness copilot being developed for the Google Cloud AI Builder Cup. Start with the [visual product brief](docs/product/overview.html) and [documentation index](docs/README.md).

## Backend quickstart

Requires Node.js 24 LTS (24.15+) and npm 12.2.0. No GCP project or credentials are needed locally.

```sh
npm ci
npm run build:api
npm run start:api
```

The Hono API runs at `http://localhost:8080`, with durable local SQLite storage. Optional settings belong in `apps/api/.env`; see [.env.example](apps/api/.env.example). The [API guide](docs/api/README.md) explains the guest-session handshake and typed client. [OpenAPI](docs/api/openapi.json) defines the current contracts.

Implemented: guest ownership, farm context, immutable assessments, hypothetical comparisons, saved-plan tracking, optional weather adapter and SQLite/Firestore persistence. Workflow checks are explicitly unreviewed. Account login, AI conversations, reviewed agronomic advice and live GCP deployment are deferred.

## Verification

```sh
npm run build:api
npm run check:api
npm run test:api
npm run openapi:check
npm run test:firestore  # Java 21+, downloads the emulator; no GCP account
```

[Infrastructure instructions](infra/README.md) cover the API container and future Cloud Run configuration. [Architecture and batch reviews](docs/architecture/backend-foundation.md) record current scope and verification limits.

## Frontend roadmap

The selected frontend is React/Vite with TanStack Router and Query. Its implementation is deferred; `apps/web` and `apps/docs` are still the original Next.js starters, available through `npm run dev`. All future browser service access must pass through Hono.

Shared packages include contracts, a browser-safe API client, pure decision logic, and the original UI/lint/TypeScript configuration. Use [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) for engineering instructions.
