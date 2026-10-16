# Contracts and provider boundaries

Implementation target, 17 October 2026. Read [stack decision](stack-and-gcp.md) first.

## Dependency rules

```text
apps/web → packages/contracts + packages/ui
apps/api HTTP routes → application services → packages/domain + server ports
server adapters implement ports → external SDKs / Firestore
packages/domain → TypeScript primitives and domain types only
packages/contracts → runtime schemas and public transport types only
```

Do not import API application modules into the frontend. Keep Firebase/Vertex admin SDKs, provider secrets and environment access out of public packages. A shared client may import public contracts; it must not import the Hono server composition root. Prefer versioned HTTP + Zod over exposing backend implementation types as the only public contract. Hono RPC may be an internal convenience, not the sole interface for future IVR/mobile clients.

## Package layout

```text
apps/web/src/
  routes/                 # TanStack generated/file-based routing
  features/farms/
  features/assessments/
  features/conversation/
  features/plans/
  lib/api/                # Same-origin HTTP client, cookie session + CSRF
  lib/query/              # Query keys/options, invalidation rules

apps/api/src/
  app.ts                  # Testable Hono factory; no listen side effects
  server.ts               # Node port and graceful shutdown
  config.ts               # Validated runtime configuration
  routes/                 # Transport validation and auth
  services/               # Use cases, orchestration and persistence lifecycle
  ports/                  # Provider/repository capabilities
  adapters/ai/
  adapters/weather/
  adapters/persistence/
  adapters/auth/
  composition.ts          # Explicit adapter selection and dependency wiring

packages/contracts/src/   # Zod schemas and transport types
packages/domain/src/      # Pure assessment/action eligibility logic
packages/ui/src/          # Accessible reusable components
```

## Initial public operations

All private operations derive ownership from a server-validated opaque cookie session. The frontend has no bearer credential to persist in localStorage. `Idempotency-Key` applies to creation/confirmation operations; reuse with a different payload is a conflict, not a new operation. List responses are bounded and paginated.

| Operation | Intended behavior |
| --- | --- |
| `GET /api/v1/session` | Resolve current session and issue a same-origin CSRF bootstrap token; no private cache |
| `POST /api/v1/session` | Validate origin/CSRF bootstrap, create guest owner/session and set HTTP-only cookie |
| `DELETE /api/v1/session` | Validate origin/CSRF, revoke session and clear cookie |
| `GET /api/v1/capabilities` | Supported district/crop combinations and public capabilities; no credentials |
| `POST /api/v1/farms` | Validate confirmed context and persist owner-scoped farm |
| `PATCH /api/v1/farms/:id` | Update using expected revision; stale edit returns conflict |
| `POST /api/v1/assessments` | Create an immutable assessment for a confirmed farm revision |
| `GET /api/v1/assessments/:id` | Fetch authorized snapshot with evidence provenance |
| `POST /api/v1/assessments/:id/compare` | Assess explicitly hypothetical constraints; no farm mutation |
| `POST /api/v1/plans` | Save reference to an owned assessment |
| `GET /api/v1/plans` | Owner-only paginated history |
| `PATCH /api/v1/plans/:id` | Update bounded task state with revision check |
| `POST /api/v1/conversations` | Start an owner-scoped context-bound conversation |
| `POST /api/v1/conversations/:id/messages` | Interpret question, run allowed tools, validate and persist response |
| `GET /api/v1/conversations/:id/messages` | Owner-only paginated messages |
| `GET /api/v1/evidence/:id` | Return permitted evidence metadata linked to an authorized assessment, or explicitly public region-pack evidence |

These are targets, not routes that exist today. Implement only the endpoints needed by the active milestone. Public errors use `{ error: { code, message, requestId, retryable } }`; no stack trace, raw prompt, upstream credential or provider response leaks.

## Domain records

- **FarmContext:** supported location ID and resolution, crop, stage/sowing window, irrigation access, user-reported field conditions, known input constraints, language and revision. Record provenance of observations; hypothetical edits are separate.
- **EvidenceRecord:** immutable ID, provider/product/version, variable, normalized units, coverage/resolution, observation period, forecast issuance/lead time if applicable, published/retrieved timestamps, quality flags, source reference and bounded normalized values/artifact reference.
- **AssessmentSnapshot:** schema/rule/region-pack versions, confirmed context snapshot/revision, evidence IDs plus required immutable values, contributing factors, missing/stale data and limitations. Hazard concerns are separate from data sufficiency. No uncalibrated crop-loss probability.
- **Action:** applicable rule ID, prerequisites, rationale, timing conditions, exclusions, source passage/page and review status. Absence of a current applicable reviewed rule returns a precise limitation; a language model cannot publish a substitute.
- **Plan:** assessment reference plus mutable task state, reasons actions cannot be completed and revision. Assessments themselves remain immutable when plan tasks change.
- **ConversationMessage:** bounded message content, context/assessment references, model/product version, tool results/references, validation outcome and timestamps. Do not embed the whole transcript in the parent document.

## Provider ports

Use distinct capability interfaces, not a universal `Provider` object:

- `WeatherForecastProvider`: short-term rainfall/temperature forecast.
- `SeasonalOutlookProvider`: regional probabilistic outlook; only add once integrated.
- `ObservationRepository`: prepared regional historical/current observations.
- `AgronomyRepository`: versioned applicable passages and structured action rules.
- `LanguageModelProvider`: constrained structured interpretation/tool calls and grounded explanation.
- `FarmRepository`, `AssessmentRepository`, `PlanRepository`, `ConversationRepository`: explicit persistence operations, including owner/revision requirements.
- `SessionRepository` / `SessionService`: validate hashed opaque token, expiry/revocation and server-derived owner; persist sessions in Firestore. No browser authentication-provider traffic.
- Speech input/output ports are added with voice implementation, not speculative empty classes.

First implement one actual adapter per used capability and a deterministic fake for tests. Prove substitution through contract tests; do not spend the POC integrating multiple interchangeable paid services merely to demonstrate an abstraction.

```ts
type ProviderResult<T> =
  | { status: 'available'; value: T; provenance: Provenance }
  | { status: 'partial'; value: T; provenance: Provenance; missing: string[] }
  | { status: 'unavailable'; reason: string; retryable: boolean };

interface WeatherForecastProvider {
  getForecast(request: ForecastRequest, signal: AbortSignal): Promise<ProviderResult<Forecast>>;
}
```

Staleness is evaluated by variable/use case and recorded in assessment policy; it is not hidden inside provider success. Unit conversion, coverage, data validation and provider errors belong in adapters. Decision applicability belongs in the domain. Timeouts, adapter selection and allowed fallback chains belong in application policy/composition.

Switching providers is not scientific interchangeability. Match required variables, horizon, units, location coverage, product version and quality policy. Recompute affected baselines where necessary. Preserve the original source in saved assessments. Reject incompatible fallback; never replace missing live data with an unlabeled fixture.

## Request and AI lifecycle

1. Verify identity and owner access; validate request and limits.
2. Resolve confirmed farm revision; reserve idempotency/operation record if required.
3. Fetch cached/prepared evidence under freshness policy and provider deadlines.
4. Run pure eligibility/assessment functions with an injected clock.
5. For conversation: allow only explicit read/compare tools initially; validate tool arguments and result schemas. Proposed context changes are not writes.
6. Generate a structured explanation from the result. Preserve authoritative numbers, actions, uncertainty and references in structured fields; validate citations/actions and withhold unsupported content. Test semantic limitations as well as JSON shape.
7. Persist completed immutable records; return only after the required save succeeds. Report incomplete operations honestly. Retry handling checks operation status, not just network exceptions.

If using a model SDK/agent library, keep its tool/message objects in the AI adapter. Do not implement an unbounded agent loop. Set a finite tool-step/token/time budget; propagate cancellation where supported; deduplicate side effects even when a client disconnects.

## Failure and cache policy

- Authentication failures: no provider work or private record access.
- Validation failures: field-level errors, no model inference.
- Stale/missing climate feed: partial assessment with dependent claims withheld.
- AI unavailable: keep previously valid structured assessment usable; mark explanation unavailable rather than presenting a canned reply as generated AI.
- Database write failure: do not report the plan as saved or silently fall back to memory.
- Per-user quota/rate limit: explicit retryable response, bounded shared enforcement across instances. Anonymous identity alone is not abuse protection.
- Persisting a revised context: optimistic concurrency and explicit user confirmation.
- Query cache: saved assessment snapshots remain immutable. New assessment creation is a mutation, not an automatic refetch on tab focus.
- Offline: drafts and explicitly dated saved views may be local; new live assessments require service access. Clear private caches when identity changes.

## Local versus deployed modes

Use the Firestore emulator and real Hono session endpoints for integration work. Require explicit mode selection; production refuses emulator/test identity configuration. In-memory repositories exist only for unit tests and never appear as an automatic deployment fallback. Fixture/replay mode must be visibly labeled and cannot satisfy live submission verification.

## Browser network boundary

Every application connection targets Hono. This includes session creation, conversation streams, model output, source retrieval, weather, media uploads and downloads. No client SDK or direct/signed URL can bypass that policy. Frontend Vite proxying is for local development only; production uses relative same-origin endpoints and restrictive CSP. Server-side adapters remain the only outbound service clients. Include a browser network assertion in end-to-end tests, not only a code-review convention.
