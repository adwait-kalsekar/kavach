# Implementation plan and agent handoff

Plan date: 17 October 2026. Stack decisions are locked in [stack-and-gcp.md](stack-and-gcp.md). Public/domain boundaries are in [contracts-and-providers.md](contracts-and-providers.md).

The user deferred cloud project setup. Complete local build, emulator-backed flows, tests and reviewable deployment artifacts before requesting project-specific setup. No deployment or resource creation is implied by this plan.

## Current repository state

- Backend-first scope and completed batch gates are recorded in [backend foundation](backend-foundation.md); that document takes precedence over the migration-first sequence below.
- Hono API, strict shared contracts, typed client, pure decision module, SQLite/Firestore adapters, tests and deployment templates are implemented.
- `apps/web` and `apps/docs` remain Next.js starters. React/Vite migration is deferred until the API foundation is merged.
- The provisional Next API sketch was removed from the application tree; it is not part of the backend implementation.
- Original product/research/architecture docs were published on main at `599ab97`. Feature worktrees must fetch and merge/rebase main to receive them.
- Account login, reviewed agronomic guidance, AI conversations and live GCP deployment remain future work.

## Original delivery sequence (remaining roadmap)

The steps below retain the broader target and acceptance criteria. They do not report current completion; use the active foundation review log and [API guide](../api/README.md) for actual implemented routes and payloads.

## Delivery order

### 0. Workspace migration and reproducible baseline

**Own:** root workspace configuration/lockfile, `apps/web` shell, `apps/api` shell, shared package exports, CI basics.

- Read root and nested AGENTS instructions. Before changing Turbo config/commands read the installed Turbo package docs that match its version.
- Keep existing npm setup; install/pin compatible versions and update one lockfile through a single integration owner.
- Replace `apps/web` with React/Vite, TanStack Router and Query. Remove Next-only files/dependencies there after migrating any useful work.
- Scaffold Hono `app` factory plus Node `server` entry, request IDs, error envelope, body limits, config validation and process liveness.
- Retain `apps/docs` as a starter unless its removal is explicitly needed; root `docs/` is the architecture/research authority. Scope POC builds to web/API and dependencies.
- Add package builds/types/tests and correct Turbo `dist` outputs. Shared domain/contracts must build before dependents; credentials cannot enter browser bundles or cached outputs.
- Vite development proxy maps `/api` to API server. Add deep-link and API JSON-404 behavior in the production static host.

**Gate:** clean install and scoped build/type checks pass; frontend loads with a typed API capability response; production static-host smoke test does not serve HTML for missing API/assets. No cloud account needed.

### 1. Contracts, evidence model and pure decision engine

**Depends on:** 0. **Own:** `packages/contracts`, `packages/domain`, small licensed/test fixtures.

- Define shared Zod schemas, provenance types, assessment snapshot, plan/task revision and the initial API operations.
- Define supported Latur/chickpea scenarios and the minimum information needed to discriminate actions. Keep data sufficiency separate from hazard concern.
- Curate action sources with exact passage/page, applicability and review status. The old district PDF is not current review evidence.
- Implement deterministic applicability functions with injected evidence/time. No model/provider/HTTP SDK imports in domain.
- Add tests for different water/input constraints, missing field facts, stage applicability and insufficient guidance. No exact sowing prescription without adequate current guidance.

**Gate:** same input/evidence/version yields the same result; a relevant constraint change changes eligible actions or states exactly why it cannot. Unsupported cases are explicit.

### 2. Identity, Firestore and durable plan lifecycle

**Depends on:** contract draft from 1. **Own:** API identity/repository adapters, emulator configuration, indexes/rules and integration tests.

- Implement Hono-managed guest cookie sessions, hashed token persistence, explicit expiry/revocation, exact-origin/CSRF checks and backend-derived owner IDs. No frontend authentication-provider SDK.
- Firestore repositories persist farms, immutable assessments and mutable saved-plan task state. Add conversations/messages when the conversation milestone needs them.
- Commit deny-all direct client Firestore rules and required indexes. Server SDK authorization lives in API policy/IAM, not these rules.
- Use expected revisions and owner-scoped idempotency reservations for confirmation/creation. Handle pending/failed operations explicitly; deduplicate retries.
- Implement bounded history and pagination; no public raw collection reads. Add query/index definitions alongside repository changes.

**Gate:** Session/API tests backed by the Firestore emulator prove persistence across API restart, isolation between two guest owners, forged owner rejection, expired/revoked-session denial, CSRF/origin rejection, stale update conflict, duplicate-submit behavior and honest write failure. Do not require live credentials for these tests. [Firestore emulator documentation](https://firebase.google.com/docs/emulator-suite/connect_firestore).

### 3. Real evidence adapter and assessment service

**Depends on:** 1 + repository interfaces from 2. **Own:** weather/data adapters and assessment service.

- Integrate one real short-term weather adapter, keeping public noncommercial versus commercial usage terms explicit.
- Validate units, horizon, dates, geography, missing/null values and upstream response bounds. No district-wide field-moisture claims.
- Implement request cancellation/deadlines, bounded retries, coalescing/cache policy, explicit freshness and provider provenance.
- Persist evidence required by each assessment, so temporary cache expiry does not destroy reproducibility.
- Add seasonal/ENSO/history adapters only when verified sources and locally useful inference are ready. Never imply satellite integration merely from catalog links.

**Gate:** adapter contract tests cover malformed, stale, partial, timeout and upstream failure states; service tests with injected adapter results prove dependent conclusions are withheld.

### 4. Mobile farmer workflow

**Depends on:** stable contracts from 1; can use explicitly labeled fixtures while 2/3 mature. **Own:** frontend features and UI.

- Implement setup → readiness → action plan → evidence → save/revisit screens from the product concept.
- Query owns server state; Router coordinates navigation/loading; forms own drafts. Include all context/version identifiers in keys where needed.
- A changed draft does not relabel an existing assessment as current. Applying a scenario is a confirmed write, not a side effect of chat.
- Support blockers and source-linked next steps, loading/error/partial states, meaningful refresh, local draft retention and dated saved views.
- Make browser-local versus server-saved status explicit. Avoid maps/charts unless they improve a specific decision.
- Test narrow mobile layout, keyboard access, long/translatable text and interrupted requests. Source drawer and controls must remain usable on a small screen.

**Gate:** user can complete the typed API-backed flow without a model; blocked/error/refresh/retry states are understandable; two-user cache isolation holds.

### 5. Gemini conversation and constrained scenario tools

**Depends on:** 1, 3 and identity/persistence contracts from 2. **Own:** model adapter and conversation service; UI integration uses stable contracts.

- Use official Google SDK with Vertex AI ADC; select the actual model only after current capability/project checks.
- Implement bounded structured context interpretation and read/compare tools. Keep no-write-by-default policy and explicit confirmation of proposed farm changes.
- Ground explanations in returned evidence/action fields and validate source/action references; evaluate unsupported-advice cases rather than trusting schema validity alone.
- Store model version, relevant tool results, context IDs and response status. Bound prompt history; do not log full farmer content by default.
- Add SSE only if useful, with a typed event contract, cancellation and stream error handling. Simple complete responses are acceptable for the first verified flow.

**Gate:** tests cover prompt injection, unsupported crop/place, missing evidence, malformed/refused output and provider timeout. Live Google AI check is a distinct deferred gate; unavailable AI is visibly unavailable, not silently simulated.

### 6. Container, GCP wiring and submission verification

**Depends on:** core 0–5. **Own:** deploy files, CI, runbook and end-to-end checks.

- Build one non-root container from the root context with web static output + compiled API. Use configured `PORT`, graceful shutdown, cache headers and bounded resource settings.
- Prepare Cloud Build/Artifact Registry/Cloud Run definitions and environment examples without real credentials. The frontend contains no Firebase/Auth/model provider client configuration or secret; it connects only to Hono.
- When the user supplies project setup: verify IAM, Firestore/indexes/rules, server session/CSRF configuration, Vertex model/quota/location and service URL; then deploy the reviewed artifact.
- Run one live end-to-end journey: identity → confirmed context → real evidence → assessment → question → confirmed scenario → save → restart/reload → same owned snapshot.
- Check denied cross-user reads and data/provider/model failure behavior; verify no broken deep links or secrets in built frontend assets.
- Assert the browser's full request trace stays on the Hono origin, including sessions, streaming, source views and any media. No direct service connection or signed object-storage bypass is permitted.
- Record actual supported capabilities, tests and limitations in README. The demo must distinguish actual data from labeled scenarios.

**Gate:** functional Google Cloud URL, public source repository, real Google AI interaction, persisted owned plans and honest uncertainty/error states. Prepare PDF architecture/business-case deck and strictly-under-three-minute demo separately.

## Agent work rules

- This plan supports agentic implementation but does not authorize uncontrolled parallel edits. Follow the active session's delegation rules; no subagents are required by this document.
- Start a work package by reading these architecture docs, root instructions and its dependency contracts. Report the actual branch/status before editing shared files.
- Make the dependency contracts reviewable before building consumers. Keep one owner for root scripts, lockfile, package exports and deployment composition.
- Keep changes in the stated ownership boundary; coordinate necessary contract changes before changing consumers. Do not replace another worktree's work or force-push main.
- Each handoff includes files changed, public contract changes, checks actually run, unresolved failures and next dependency. Distinguish fake/emulator/live checks.
- Complete milestone gates once; do not substitute broad repetitive test runs for unresolved integration work.
- Do not reopen the chosen stack absent a concrete incompatibility. Do not add infrastructure, paid integrations, database provision or a second model provider just to fill an architecture diagram.
- Preserve provenance and uncertainty. No code path can turn fixtures into current observations or label unreviewed rules as reviewed.
- Keep docs indexed and current. Commit/push only intentional changes; existing uncommitted work and other worktrees require inspection first.

## Immediate next implementation task

Milestone 0: migrate the starter to React/Vite and scaffold Hono/contracts with a working local capability route. Defer cloud provisioning. Migrate the provisional domain/API sketch only after boundary and source review in milestone 1. The implementation can proceed without another stack-choice discussion.
