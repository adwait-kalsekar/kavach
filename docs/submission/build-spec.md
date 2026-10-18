# Deadline implementation specification (proposed)

This is **work to implement**, not the current OpenAPI. Current routes remain in [API guide](../api/README.md). Target one sample-only, English Latur/chickpea journey. The full product and private saved-plan APIs remain unchanged.

## File and dependency map

| Path                                                                                                | Work                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/contracts/src/index.ts`                                                                   | Strict demo request/response schemas; add endpoint registry entries and generated OpenAPI                                                                                                                    |
| `packages/domain/src/index.ts`                                                                      | Reuse `evaluate`; do not import model, HTTP or Firestore SDKs here                                                                                                                                           |
| `apps/api/src/demo/scenarios.ts` (new)                                                              | Two labelled synthetic contexts with stable scenario IDs/version                                                                                                                                             |
| `apps/api/src/services/demo.ts` (new)                                                               | Construct internal sample Farm snapshots, evaluate/compare, ground explanation, enforce bounds                                                                                                               |
| `apps/api/src/ports/explanation.ts` (new)                                                           | Provider interface + disabled adapter; no SDK types in shared contracts                                                                                                                                      |
| `apps/api/src/adapters/google-explanation.ts` (new)                                                 | Server-only official Google SDK, ADC, cancellation and validated structured output                                                                                                                           |
| `apps/api/src/app.ts`                                                                               | Explicit public-demo middleware **before** generic private-session middleware; typed chained routes for RPC                                                                                                  |
| `apps/api/src/ports/store.ts`, Firestore index/TTL definitions                                      | Add a dedicated `demoCache` collection if used; SQLite is collection-generic, but its allowed Collection type must also be extended. Keep quota records in the existing quotas collection with distinct keys |
| `apps/api/src/config.ts`, `composition.ts`                                                          | Validated model/provider configuration and explicit adapter selection                                                                                                                                        |
| `packages/api-client/src/index.ts`                                                                  | Dedicated demo transport using only the configured API origin and credentials: omit; retain private clients                                                                                                  |
| `apps/web/src/features/demo/` (new), `src/router.tsx`                                               | Scenario/checks/compare/explain UI; retain diagnostic health route                                                                                                                                           |
| API/client/domain tests + `tests/e2e/`                                                              | Register tests in `apps/api/tests/run.mjs` and `firestore-run.mjs` where applicable; add real demo journey                                                                                                   |
| `.github/workflows/backend.yml`, `infra/gcp/config.mjs`, `deploy.mjs`, deploy tests, `.env.example` | Pass/validate provider, model ID and model location; do not rely on inherited Cloud Run env                                                                                                                  |
| `infra/gcp/live-smoke.mjs`                                                                          | Verify the public judge journey and actual provider/model metadata after rollout                                                                                                                             |

Keep existing runtime import guards. Only the browser-safe client may type-import `@kavach/api/rpc`. New demo schemas live in contracts; production code lives in the API, not the client. Query owns server state; scenario input drafts do not mutate confirmed assessments implicitly.

## Public route proposal

Use the normal `{data,meta:{requestId}}` / `{error:{code,message,requestId,retryable}}` envelopes. These endpoints do not exist until implemented and generated into OpenAPI.

| Operation       | Route                        | Request / behavior                                                                                                                                                     |
| --------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demoScenarios` | GET `/api/v1/demo/scenarios` | Server-owned labels, scenario IDs, context/version; no user records                                                                                                    |
| `demoAssess`    | POST `/api/v1/demo/assess`   | `{scenarioId, changes?: {irrigation?: "none"\|"one"\|"assured"}}`; no empty changes, unknown fields, district/crop override or arbitrary owner IDs                     |
| `demoExplain`   | POST `/api/v1/demo/explain`  | Same scenario + optional irrigation change and `question: "explain-checks"\|"explain-change"`; `explain-change` requires a non-empty change that differs from baseline |

Example assess request:

```json
{
  "scenarioId": "latur-chickpea-limited-water",
  "changes": { "irrigation": "none" }
}
```

Return a versioned baseline and optional hypothetical assessment using the existing assessment schema, plus `demo:true`, `scenarioId`, `scenarioVersion`, `persisted:false`. Create internal UUIDs/timestamps on the server; the synthetic Farm passed to `evaluate` must never be written to the farms collection. Compare only the requested field, preserve original context and label the hypothetical result. Scenario IDs/version/enum/length constraints must be actual Zod types in the final contract, not unchecked strings copied from this document.

Suggested explanation shape inside data:

```json
{
  "demo": true,
  "persisted": false,
  "scenarioId": "latur-chickpea-limited-water",
  "scenarioVersion": 1,
  "status": "available",
  "assessment": {},
  "explanation": {
    "summary": "...",
    "actionIds": ["rainfed-check", "check-moisture"],
    "missingFacts": ["field-moisture"],
    "limitations": ["Unreviewed planning checks; not a sowing approval."]
  },
  "model": {
    "provider": "google",
    "id": "<verified model>",
    "version": "<returned version or null>",
    "generatedAt": "<UTC>",
    "cached": false
  }
}
```

`assessment:{}` above is only shorthand for the **full existing assessment schema**, not a valid response. Define the real schema and example before UI use. Include baseline/comparison and explanation provenance consistently. Define a discriminated unavailable branch with a bounded public reason/retryable flag, no explanation/model-success fields, and no synthetic successful text. A successful fresh generation requires an actual provider result. Cached model output retains its original generatedAt/version and is labelled cached; a reused response must not acquire a new “generated now” timestamp. No provider key, raw prompt, stack or credential is returned.

The explain service must recompute from server-owned scenario/changes. It must not accept client-supplied assessment, instructions, model ID or source URL. Initial scope has no freeform prompt and no tool loop. Prompt-injection text belongs in negative tests, not a public arbitrary chat field.

## Session and abuse boundary

Public sample endpoints must be registered/exempted narrowly before the general `/api/v1/*` owner/session guard. Existing health/capabilities behavior and every private farm/assessment/plan route keep their current policy. **Do not broadly allow all `/api/v1/*` cross-site traffic.** Add coverage proving each old protection still holds.

For public demo POSTs: require exact configured frontend Origin and JSON Content-Type, bounded bodies, strict contracts, route-specific OPTIONS, and an Origin-only CORS allowlist. Permit cross-site requests for **these public sample routes only** and do not resolve/read/write guest cookies. Their client uses credentials: omit. This is a public calculation with no ambient user authority, so it has no guest CSRF token. Wrong/missing/null Origin is denied for the browser POST route. Public GET scenario metadata may be read by non-browser clients; CORS controls browser access, not authentication.

CORS and an Origin header are **not cost protection**: scripts can forge Origin. Before enabling paid inference, reserve an app-wide per-minute and per-day budget atomically in Firestore using the existing transactional store. The existing consumeQuota helper handles minutes only: implement/read both minute/day counters before writes in a single transaction for the new AI budget; do not claim it already supports a daily cap. Suggested initial ceilings: 10 paid model requests/minute and 100/day for the entire demo, with a separately bounded overall request quota. Make ceilings configurable and record them in the operating notes; exceeding them returns structured 429 with Retry-After. Use a dedicated collection/key prefix, expiry enforcement plus TTL configuration when applicable. Never delete unrelated session data to reset quotas.

Cache by scenario version + canonical changes + question + model + prompt/rule versions + weather snapshot if used. Limit key cardinality to the allowlisted combinations; use an initial 15-minute cache TTL and enforce expiry in application code. Reserve quota before every actual model invocation, even failed attempts; do not automatically retry a paid call. Process-local cache/coalescing can reduce duplicate calls but is not cross-instance coordination. A simple first version can count simultaneous duplicate calls against the shared cap rather than introducing a distributed job system. Record this limit honestly. Do not trust arbitrary X-Forwarded-For as an authenticated identity and do not depend on in-memory counters across Cloud Run instances.

## Model boundary and grounding

Keep an interchangeable internal `ExplanationProvider` with `explain({baseline,comparison?,question}, signal)` returning an available/unavailable union plus provider metadata. The disabled provider makes no network request. Production selects only the configured Google adapter; tests may inject an explicitly named fixture adapter. Never silently fall back to fixture text when the live provider fails.

Use the official `@google/genai` package server-side with ADC, a pinned tested version and a verified model/location. Read that installed version's types/examples: Google's current pages contain both Vertex/enterprise naming and different constructor options, so do not blindly copy old snippets. Model identity/configuration is selected on the server; do not expose provider switching controls to the browser.

Bound initial output to roughly 150 words, a small output-token limit and a 20-second server deadline. Propagate cancellation to the SDK/HTTP transport; a Promise.race alone is not cancellation. The UI may wait 25 seconds for this operation; do not reuse the health screen's five-second deadline. Keep Cloud Run request timeout at least 60 seconds. Prefer one structured generateContent call over an autonomous tool loop for this deadline.

The deterministic result is the source of truth. Model output may explain the known checks, missing facts and comparison; it cannot alter readiness, numeric evidence, eligible actions or context. Return/display action titles and factual badges from the validated deterministic assessment. Validate action/source IDs against that assessment and restrict missing-fact IDs to a known enum; reject unknown references. Prompt instructions alone are not sufficient grounding. On malformed output, refusal, timeout or unsupported factual claims, show an unavailable explanation with the deterministic checks intact. Conservative rendered output and negative tests must cover invented dates/doses/yield claims. Do not label the explanation as agronomic review.

Start with weather unavailable and say so. The existing Open-Meteo adapter can be enabled only after a real request, source freshness/terms check and proper provenance; do not let it delay the model/UI/deployment. Historical climate and satellite feeds remain disconnected.

## UI acceptance

One screen can contain three progressive panels rather than a large navigation system:

1. **Sample setup:** visible “Demonstration scenario” badge; Latur/chickpea; crop stage, irrigation and unknown moisture; primary “Check constraints”. No precise farmer location, name or phone collection.
2. **Checks and comparison:** up to three deterministic checks; missing-fact banner; switch from one irrigation to none and display baseline versus hypothetical differences with text, not just color. No automatic writes, fake savings or risk percentage.
3. **Explain and evidence:** “Explain these checks” / “Why did this change?”; actual pending/error/retry states; Google model identity/time/cached label; evidence/limits drawer. An old unreviewed CRIDA reference is context, never a claim that it supports every generated sentence. Missing live weather is explicit.

Mobile: 390px minimum smoke viewport, readable controls, associated form labels, keyboard focus, no horizontal overflow and accessible status updates. Do not poll the model on focus/refetch; generate only after an explicit action. Query keys include scenario/changes/question/version. Cap retry and repeated-click behavior. Keep UI responsive when the model fails; deterministic checks still work.

## Batch checks and release gate

After contract/API work: build + check-types, schema/OpenAPI drift, assess/compare changes, cross-site public success, wrong-origin denial, cookie isolation, body/enum limits and private-route regression tests. After model work: injected failure/refusal/malformed/unsupported output, finite cache keys, quota reservation under concurrency, no secret/log leak. Live Google call is separate from fixtures.

After UI work: a Playwright judge flow on desktop/mobile runs actual API requests, scenario → changed irrigation → changed checks → explanation, plus provider outage and model retry. Default clean CI must run injected/disabled model tests without credentials or public weather dependence. Live smoke after deployment must verify **genuine Google-backed output and metadata** and cookie-free requests to only the web/API origins. Reserve quota for those deployment checks and fail release acceptance if model output is unavailable. Existing health-only live smoke is insufficient for prototype acceptance.

```sh
npm run build:app
npm run check:app
npm run test:api
npm run openapi:check
npm run test:deploy
npm run test:e2e
npm run test:firestore
```

If contracts changed, build them and run `npm run openapi -w @kavach/contracts` before openapi:check. Build/smoke both images using [infra commands](../../infra/README.md). Do not call all these checks “passed” until actually run. Test-only model fixtures must never become production fallbacks.
