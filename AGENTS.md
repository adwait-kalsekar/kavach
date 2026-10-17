<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Kavach engineering instructions

## Read first

- `docs/README.md` indexes the project; `docs/architecture/README.md` records the selected stack.
- Read `docs/architecture/backend-foundation.md` for the implemented backend and `docs/architecture/web-foundation.md` for the active web/API setup.
- Keep architecture documents, Mermaid diagrams, API contracts/examples and actual implementation status synchronized in the same change. Do not describe planned capabilities as implemented.

## Boundaries

- Browser → Hono only. No browser cloud/auth/AI/weather/storage SDK, service connection, signed upload URL or external telemetry. Serve/proxy assets, sessions, evidence and media through Hono.
- `apps/web` uses React/Vite + TanStack Router/Query. Follow `docs/architecture/web-foundation.md` for local development, Hono RPC and GCP packaging. `apps/docs` remains a separate Next starter.
- Browser code imports only `@kavach/api-client` and public contracts, never API implementations. Only `packages/api-client` may import `@kavach/api/rpc` with `import type`; this export has no runtime entry. Keep route chains typed, require mutation headers and run the negative RPC type checks.
- Run `npm run check:boundaries`; the Vite bundle guard also rejects API/domain/cloud SDK modules. Do not weaken these guards to make a build pass. No service credentials or secrets belong in Vite variables.
- Keep public Zod contracts in `packages/contracts`, pure decision logic in `packages/domain`, browser-safe HTTP client in `packages/api-client`, and SDKs/config/secrets in `apps/api`.
- Hono owns validation, sessions and transport; services own orchestration; adapters own provider integration. Validate outgoing as well as incoming payloads.
- No frontend-owned `ownerId`; derive ownership from validated server session. Enforce ownership for every resource read/write and linked-resource reference.
- Immutable assessments retain context, provenance and rule versions. Comparing a scenario never updates a farm implicitly.
- Never label fixtures as live data, missing weather as zero rainfall, or unreviewed agronomic rules as reviewed advice.

## Local / production

- Local development requires no GCP project. Explicit SQLite local storage is allowed; it is not production persistence. In-memory stores are for tests only.
- Production uses Firestore, workload identity/ADC and validated configuration. Refuse local storage, emulator configuration or localhost origins in production. Never silently fall back from Firestore to local storage.
- Keep secrets and runtime databases outside Git; document required variable names in `.env.example`. Never store cloud keys or credentials in frontend configuration.
- GCP project is `kavach-farmers-market-sense`; see `docs/deployment/gcp-setup.md`. A project ID grants no access. Bootstrap defaults to an offline plan; never use --apply without actual provisioning authorization and verified identity. Emulator/mocked deploy tests are not live GCP verification.
- CI deployment is gated by successful verify + trusted main + GCP_DEPLOY_ENABLED, with WIF restricted to repository IDs/workflow/production. Deploy only the exact tested image by digest; keep runtime/deploy identities separate. CI must not edit IAM policy. Never create JSON keys or weaken trust/CSP/origin checks to unblock deployment.

## Work and review

- Plan a bounded batch, implement it, run appropriate checks, review failures and update `docs/architecture/backend-foundation.md` before starting the next batch.
- For web/API changes, run `npm run build:app`, `npm run check:app` and `npm run test:e2e` (install Chromium first). Browser tests cover local proxy and built Hono serving; retain same-origin request assertions and CSP.
- Test contracts, cross-owner denial, CSRF/expiry, optimistic concurrency, idempotency and failure states. Use deterministic clocks/provider fixtures where useful.
- Keep one integration owner for lockfile/root workspace/deployment changes. Do not delegate unless the user or an applicable instruction explicitly requests it.
- Use the repository's required npm version (12.2.0); no extra package manager. Read installed framework docs before relying on changing APIs.
- Do not force-push, overwrite another worktree or claim a build/test passed when it was blocked. Report blocked checks precisely.
