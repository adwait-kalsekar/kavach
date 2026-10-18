# API integration guide

The backend foundation is independent of UI and needs no GCP project in local mode. The React/Vite home route uses the public synthetic demo; `/health` calls the typed diagnostic endpoint. See [web/RPC architecture](../architecture/web-foundation.md) for UI setup and browser boundaries.

## Start locally

Use Node 24.15+ with the built-in SQLite driver (local tooling only) and the repository-required npm 12.2.0.

```sh
npm ci
npm run build:api
npm run start:api
```

The API listens on `http://localhost:8080`. Defaults use a durable `.data/kavach.sqlite` file under the repo root and disable external weather/AI requests. No cloud credentials or auth account are required. For configuration, copy [apps/api/.env.example](../../apps/api/.env.example) to `apps/api/.env`; paths are relative to the repository root. `npm run dev:api` runs TypeScript through tsx and rebuilds shared dependencies through Turbo watch. `npm run dev` starts the UI too. Use APP_ORIGIN=http://localhost:3000 for the independently served Vite UI; the browser calls Hono directly on 8080.

- `GET /api/v1/health`: public runtime-validated RPC liveness response (`status`, `service`, `apiVersion`, `checkedAt`) in the normal envelope. No guest session is required or created. This proves API reachability, not database readiness.
- `GET /healthz`: process liveness.
- `GET /readyz`: database readiness (bounded check).
- `GET /api/v1/openapi.json`: generated OpenAPI 3.1 contract.
- [Committed OpenAPI](openapi.json): generated from `packages/contracts`.

## Public synthetic demo

The exact public sample endpoints use a dedicated `createDemoClient(apiOrigin)` with `credentials: omit`. They never create private farm records. POST requests require the configured exact Origin; no session/CSRF token is used for these nine exact route/method pairs. Other routes retain their guards. See [POC architecture](../architecture/poc-implementation.md) for audio bounds, quotas, evidence and provider configuration.

New farmer-planning operations:

- `GET /api/v1/demo/planning`: allowlisted location/crop catalog with dated rainfall provenance.
- `POST /api/v1/demo/water-plan`: strict inputs and available/needs-input calculation; no inference or farm record write.
- `POST /api/v1/demo/water-plan/explain`: same inputs, locale, voice flag, question enum and optional bounded text/history; server recomputes before model use. History is untrusted context, not evidence. Shared model/TTS quotas apply; no arbitrary-input cache.
- `POST /api/v1/demo/planning/transcribe?locale=en-IN`: bounded WAV → transcript only; does not edit numeric fields. Shared STT quota applies.

```json
{
  "regionId": "beed",
  "crop": "chickpea",
  "plannedAreaAcres": 3,
  "alternativeAreaAcres": 1.5,
  "usableWaterLitres": 180000,
  "netApplicationMm": 20,
  "efficiencyPct": 70
}
```

Water may be known zero or unknown (`null`); these differ. Areas are 0.1–100 acres, water 0–100,000,000L, depth 1–300mm or null, efficiency 1–100% or null. Empty application inputs return needs-input, never a made-up dose. These bounds constrain the public demo, not agronomic validity. `createDemoClient` exposes `planning`, `waterPlan`, `waterExplain`, and `planningTranscribe` methods alongside legacy operations.

```ts
import { createDemoClient } from "@kavach/api-client";
const demo = createDemoClient("http://localhost:8080");
await demo.scenarios();
await demo.message({
  text: "What if I have no irrigation?",
  locale: "en-IN",
  voice: false,
});
await demo.assess({
  scenarioId: "latur-chickpea-limited-water",
  changes: { irrigation: "none" },
});
await demo.explain({
  scenarioId: "latur-chickpea-limited-water",
  changes: { irrigation: "none" },
  locale: "en-IN",
  question: "explain-change",
  voice: true,
});
// A captured PCM16 mono 16 kHz WAV Blob, at most 30 seconds / 1 MiB:
await demo.transcribe(wavBlob, "en-IN");
```

`GET /api/v1/demo/scenarios`, `POST /api/v1/demo/assess`, `POST /api/v1/demo/explain` `POST /api/v1/demo/transcribe?locale=en-IN` and `POST /api/v1/demo/message` are defined in the generated OpenAPI. Model/audio/transcription availability is explicit. An interpreted water proposal does not apply changes; the UI requests confirmation. Typed text is trimmed and limited to 1200 characters, goes through the server-only closed-intent interpreter, and is not stored. Read-only requests may proceed to an explanation; this is not a general freeform chat API. The existing voice response keeps its legacy confirmation flag for older web clients. No arbitrary text-to-speech or paid freeform prompt endpoint is exposed.

## Private session and request sequence

There is no account login. Hono issues a guest browser session to isolate records. HTTP-only cookies carry the session token; the frontend never reads or persists it. All requests use the Hono origin. The browser adds Origin to mutating fetches; command-line clients must send the exact configured Origin themselves.

```ts
import { createApiClient } from "@kavach/api-client";

const api = createApiClient();
const bootstrap = await api.request("session", {});
const guest = await api.request("createSession", {
  csrfToken: bootstrap.data.csrfToken,
  body: {},
});
const csrfToken = guest.data.csrfToken; // Rotated on guest-session activation.

const farm = await api.request("createFarm", {
  csrfToken,
  idempotencyKey: crypto.randomUUID(),
  body: {
    context: {
      district: "Latur",
      crop: "chickpea",
      stage: "planning",
      irrigation: "one",
      moisture: "unknown",
      seedAvailable: true,
      language: "en",
    },
  },
});
const assessment = await api.request("createAssessment", {
  csrfToken,
  idempotencyKey: crypto.randomUUID(),
  body: { farmId: farm.data.id, expectedFarmRevision: farm.data.revision },
});
const scenario = await api.request("compare", {
  id: assessment.data.id,
  csrfToken,
  idempotencyKey: crypto.randomUUID(),
  body: { changes: { irrigation: "none" } },
});
// scenario is hypothetical. The original farm and assessment are unchanged.
const plan = await api.request("createPlan", {
  csrfToken,
  idempotencyKey: crypto.randomUUID(),
  body: { assessmentId: assessment.data.id },
});
const history = await api.request("listPlans", { query: { limit: 20 } });
```

Reuse an idempotency key only when retrying the same logical request. Creation is atomically deduplicated for 24 hours; a changed payload with the same key returns 409. Provider calls are outside transactions: concurrent requests may fetch the same non-paid weather feed, but cannot create duplicate records for the same operation. Paid AI orchestration is not implemented and must add operation reservation before such calls.

Farm/task updates require the expected current revision and return 409 on conflict. IDs/fields, unknown properties and response bodies are runtime-validated. Empty hypothetical changes, unknown action IDs, duplicate task IDs and inconsistent blocker states are invalid.

To apply a hypothetical change: explicitly confirm it, PATCH the owned farm using its current revision, create a new confirmed assessment, then save that assessment. Saving a hypothetical assessment as a confirmed plan returns 409.

## Responses and errors

Success: `{ data, meta: { requestId } }`. Errors: `{ error: { code, message, requestId, retryable, issues? } }`. Every response also carries `X-Request-ID`; personal API responses are `no-store`.

| Status    | Meaning                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| 400       | Malformed JSON, invalid schema, ID, cursor or action state                     |
| 401       | Missing/expired/revoked guest session                                          |
| 403       | Invalid Origin/CSRF                                                            |
| 404       | Resource absent or owned by another visitor; same response to avoid disclosure |
| 409       | Revision or idempotency conflict; or attempt to save a hypothetical plan       |
| 413 / 415 | Oversized body / wrong content type                                            |
| 429       | Shared request quota; retry after the supplied delay                           |
| 500       | Internal/storage failure, sanitized and correlated by request ID               |

Available weather includes units in field names and product/source/coverage/retrieval provenance. Unavailable weather has no numeric fields. The absence of weather never becomes zero rainfall. Comparisons deliberately retain the original assessment's weather snapshot; create a new assessment to refresh evidence.

## Implemented versus deferred

Implemented: guest sessions; capabilities; farm create/read/update; immutable assessment create/read/compare; saved-plan create/read/update/paginated history; strict contracts; local SQLite and Firestore adapters; optional Open-Meteo; structured failures.

Deferred: recoverable accounts, Gemini/Vertex inference, conversation endpoints, speech, farmer-facing screens, satellite/seasonal ingestion, validated agronomic prescriptions and live GCP deployment. `capabilities` advertises AI unavailable and conversations false. The current engine returns planning/verification checks with unreviewed status; it does not claim sowing dates, irrigation doses or crop-loss probabilities. `sourceIds: []` intentionally means a workflow check is not being represented as a sourced agronomic recommendation.

## Verification

```sh
npm run build:api
npm run check:api
npm run test:api
npm run openapi:check
```

To regenerate the specification after contract changes: `npm run openapi -w @kavach/contracts` after building contracts. Review the generated diff alongside the service/client changes.

Firestore parity: Java 21 and Firebase CLI are development dependencies/tooling; `npm run test:firestore` starts the official emulator using `demo-kavach` and runs the same API journey tests against isolated emulator databases. It does not require a real GCP project or use cloud credentials. The emulator does not enforce production composite indexes or IAM, so those remain explicit deployment checks.

For UI integration, set `APP_ORIGIN` to the exact frontend origin. The independently served React app calls the configured Hono API origin directly with credentialed CORS; it never uses an API proxy. Default Cloud Run URLs support health only; guest sessions need same-site sibling custom domains. Do not expose emulator endpoints, cloud credentials or service SDKs to frontend code.


## Public seasonal-readiness sample

`POST /api/v1/demo/readiness` accepts:

```json
{"regionId":"nanded","crop":"wheat","intent":"sowing","stage":"pre-sowing","soil":"unknown","moisture":"unknown","irrigation":"none"}
```

Returns dated regional evidence, historical comparisons, crop sources and deterministic verification tasks. Ten exact district IDs/three crops are defined in OpenAPI. These are grid samples and unreviewed crop context, not a calibrated farm-risk prediction or sowing prescription. `POST /api/v1/demo/readiness/explain` adds locale (en-IN/hi-IN/mr-IN), voice, question (season/history/actions/water), optional bounded text/history and optional matching water assumptions. Server recomputes results and binds a version-1 allowlisted visual envelope; no model HTML/measurements. Optional water must match region/crop. Exact public guards and credential-omit transport remain; private session/CSRF/ownership is unchanged. See [method/limits](../architecture/season-readiness.md).
