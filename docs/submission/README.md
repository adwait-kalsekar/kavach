# Eight-hour prototype sprint — start here

Updated 18 October 2026. This is the active deadline plan, superseding the broad implementation order for this submission. Budget: **eight elapsed hours from your start**, including deployment and upload. The public site says October 18; confirm the exact time/timezone in your registered entrant dashboard. Do not assume 23:59 IST.

## Outcome and honest scope

Ship one working, mobile-friendly **Latur/chickpea planning demonstration** on Google Cloud, with a genuine Google-model interaction and a visible comparison when irrigation access changes. Theme: **Sustainability & Social Impact**. Product claim: “Kavach helps explain which planning checks change when a farmer's resources change.” These are unreviewed workflow checks, not agronomic prescriptions or a validated drought predictor.

The core differentiator to show is **resource feasibility**, not a generic agricultural chatbot: one irrigation becomes no irrigation; the deterministic checks change, Gemini explains the change and unknown field moisture remains visibly unknown. No invented sowing dates, irrigation doses, yield gains or field measurements.

Already implemented: Hono API; strict Zod/OpenAPI contracts and typed RPC; deterministic planning checks; guest ownership, farms, assessments, comparison and saved plans; SQLite/Firestore adapters; responsive React/Vite health screen; independent web/API container images; GCP provisioning and verified main-to-Cloud-Run deployment. **Not implemented yet:** farmer demo screens, public stateless demo endpoints, model adapter or live AI. The deployed default-URL experience is health only. New routes in [build specification](build-spec.md) are proposals, not working endpoints.

## The deadline decision: public stateless sample demo

Use the two default Cloud Run HTTPS URLs. Their different sites make the existing guest cookies unsuitable for reliable cross-site mobile use. A custom sibling domain and its routing remain deferred. Do **not** disable CSRF/ownership, set permissive CORS or move session tokens into localStorage to make the demo work.

Instead add a **separate, explicitly public, sample-only demo surface**. It accepts a small allowlist of labelled synthetic scenarios, calls the same pure decision engine and a server-only Google model, and returns an ephemeral result. It creates no farmer account, private farm, plan or persistent conversation. Operational quota/cache records may live in Firestore. It ignores cookies and uses credentials: omit. Existing private endpoints and their session policy remain unchanged.

This is a new deadline recommendation, not an implemented exception to security. Implement exact UI-Origin checks, route-specific CORS/preflight and the public demo contract before exposing it. Keep the current health-only deployment until this passes. The deployed demo must explain “Sample scenario — not your saved farm.” A browser-local print/download can be a later convenience; it is not server persistence.

**Cut from this sprint:** accounts, domain/load balancer, saved-plan UI, voice, maps/satellite pipelines, historical forecasting, multilingual claims, notifications, freeform multi-turn chat, new framework choices and a second deployment controller. Existing private APIs remain useful beyond the POC. Use English for submission materials and this first verified UI.

## What you need now

| Input/tool                                       | Why / action                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Dashboard access and exact cutoff                | Verify registration/team, category and upload fields immediately                                |
| GCP account with billing + setup permission      | Project `kavach-farmers-market-sense`; check [owner setup](../deployment/gcp-setup.md)          |
| A working Google-model ID and supported location | Verify in this actual project; do not guess from examples or switch models during the recording |
| Local Node 24 LTS and npm 12.2.0                 | Repository version requirement; npm 11 fails its engine gate                                    |
| Git/GitHub owner access                          | Pull main; configure the production environment/WIF variables; approve source publication       |
| Docker or the existing CI builder                | Test actual runtime packaging; do not run Vite preview in production                            |
| Python 3; Java 21+ for Firestore emulator        | Bootstrap/model diagnostic and the full parity suite                                            |
| Screen recording + PDF export                    | Submission includes video, PDF deck and public source, not just a deployed URL                  |

Do not paste keys/tokens into chat. Prefer local ADC/attached Cloud Run identity; no frontend model SDK or key. On 18 October the owner authenticated the local gcloud setup identity; provisioning and the first live CI deployment are verified. See the [live setup log](../architecture/backend-foundation.md#authorized-live-setup--18-october-2026). Installing gcloud or knowing the project ID alone does not grant deployment access.

## First local commands

Run in a clean local checkout. Preserve your existing uncommitted changes before switching branches. For an existing feature branch, fetch and merge/rebase main deliberately instead of overwriting it.

```sh
git fetch origin
git switch main
git pull --ff-only origin main
node --version
npm install --global npm@12.2.0
npm --version
npm ci
# Create this file only if you do not already have it:
cp apps/api/.env.example apps/api/.env
npm run dev
```

Open `http://localhost:3000`; the browser calls Hono at `http://localhost:8080`. Keep API APP_ORIGIN=http://localhost:3000. Both ports must be free. SQLite and disabled providers work without cloud access; a green health screen does not prove AI or deployment. Commands use POSIX shell syntax; on Windows use WSL/Git Bash or translate the copy/environment commands to PowerShell.

## Eight-hour schedule and hard checkpoints

Start the clock now. Provisioning/index builds and CI can take time; start them early rather than at hour six. The owner can complete console setup while local code work proceeds.

| Elapsed   | Work                                                                                                        | Required exit / cut rule                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:30 | Pull main; run health; verify billing/permissions and one real model response; begin existing GCP bootstrap | If access/model is blocked, resolve immediately. A local mock is not a compliant substitute                                          |
| 0:30–1:30 | Demo contracts, sample scenarios, bounded public API, quotas/cache and pure-engine reuse                    | Exact-origin success; wrong-origin denial; private endpoints still protected; model can remain disabled during API tests             |
| 1:30–3:00 | Mobile demo UI: scenario → checks → irrigation comparison → evidence/limits                                 | Working UI/API flow on 390px and desktop; synthetic labels and real error/retry states                                               |
| 3:00–4:00 | Server-only Gemini adapter + one grounded explain interaction                                               | Verified live model output with IDs/version/time; reject unsupported references and claims. No need for a multi-step agent framework |
| 4:00–5:00 | Deploy both services, inspect live UI/API/model behavior and cold-start retry                               | Public incognito link completes the sample flow with no cookies or Google login                                                      |
| 5:00–6:00 | Integration/negative tests, provider outage check, source audit, freeze code                                | No secret/browser SDK leak; do not add a new feature after this gate                                                                 |
| 6:00–7:00 | Export deck; record 2:40 demo; publish/review repo and links                                                | PDF, video, public source URL, deployed link all open without the author's login                                                     |
| 7:00–8:00 | Upload, verify fields, submit, retain confirmation; buffer only                                             | Submit early. Check all links from a signed-out browser and retain submission receipt                                                |

No guarantee is made that cloud policy/quota/billing problems can be solved inside eight hours. At hour four, cut optional weather and freeform chat rather than shipping fake AI or skipping deployment. Keep an accurately labelled provider-unavailable state. If Google AI or GCP hosting still cannot work, the entry is not yet meeting the official functional requirements.

## Build in these files, in this order

Read [exact implementation specification](build-spec.md) before coding. It defines the public/owned API split, wire examples, model interface, quotas, UI behavior and acceptance gates. Read [cloud/model first-hour steps](cloud-and-model.md) for credentials, model smoke, IAM and CI deployment wiring. Prepare the [submission checklist](submission-checklist.md) and [deck starter](deck-outline.md) before hour six.

Keep the existing stack and boundaries. Do not migrate routers, database or agent frameworks. Use normal HTTP JSON for the initial model answer; streaming and tool loops are optional only after the end-to-end demo is already deployed. The explanation endpoint already has a deterministic assessment to ground the model; that is meaningful model integration without claiming autonomous tool use.

## Prompt for your local coding agent

Paste this after syncing main:

> Read AGENTS.md, CLAUDE.md, docs/submission/README.md, docs/submission/build-spec.md and docs/submission/cloud-and-model.md. Implement the proposed public sample-only demo in the timeboxed batches specified there. Start with the strict shared contracts and public/owned security split; reuse the existing pure evaluate function. Keep React/Vite + TanStack Router/Query, Hono RPC, separate web/API Cloud Run services and Firestore production storage. Do not weaken private routes or introduce browser cloud/model SDKs. Add a server-only interchangeable explanation provider and one genuine Google-model response; use an explicitly disabled adapter until credentials/model are verified. Build scenario selection, constraint comparison, an evidence/limits drawer, and the model explanation/retry UI. Keep the sample demo stateless; do not build login, domain routing or saved-plan screens for this deadline. Update docs/OpenAPI/RPC types and run the relevant batch checks. Integrate every new test file into the repository test runner. Add the new runtime model configuration to deployment helpers/tests; flags added only to .env do not configure Cloud Run. Extend live browser smoke to complete the public demo and verify model metadata, not merely health. Do not claim unavailable model output is live AI, or unreviewed workflow checks are agronomic advice. Ask only for actual missing access/decisions; keep the existing source/build/security boundaries intact. Never publish the private repository or make cloud IAM changes without the owner's authorization. Stop feature work by elapsed hour six and prepare the submission artifacts.
