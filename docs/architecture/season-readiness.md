# Maharashtra seasonal-readiness engine

18 October 2026. Core backend batch; frontend and live rollout status recorded in backend-foundation.md. Implements the brief's Sense → Compare → Decide → Explain boundaries with honest coverage limits.

```mermaid
flowchart LR
  EE[Earth Engine offline CHIRPS and ERA5] --> P[Validated versioned regional snapshots]
  N[NOAA ONI] --> P
  C[CRIDA calendars and district contingencies plus ICAR crop guidance] --> R[30 district/crop context records]
  UI[React farmer selections] --> H[Hono exact public routes]
  P --> H
  R --> H
  H --> D[Pure seasonal stress and source-condition checks]
  D --> A[Canonical evidence and eligible verification tasks]
  A --> G[Bounded Gemini explanation and view selection]
  A --> V[First-party evidence/action components]
  G --> V
  V --> L[Local baseline, climate and evidence learning controls]
```

Ten locations: Latur, Beed, Nanded, Dharashiv/Osmanabad, Parbhani, Hingoli, Jalna, Chhatrapati Sambhajinagar/Aurangabad, Solapur, Ahilyanagar/Ahmednagar. Crops: gram/chickpea, **rabi** jowar/sorghum, wheat. These are approximate town-centre grid samples, **not district means or field observations**. Regional and crop scope must match exactly in the pure engine.

## Acquired evidence and reproducibility

`apps/api/src/evidence/season-readiness/regions.json` contains strict validated snapshots for all ten locations. CHIRPS v3 DAILY_RNL (0.05°/~5.6 km) totals June 1–September 30, 2026 and matching historical years; baseline 1991–2020, 122 complete daily grid values per region-year. Four historical examples: 2002, 2009, 2015, 2023; no causal or probability interpretation. Baseline uses the same product/window/geography. Departure = 100×(current/baseline−1). Do not compare this JJAS product against the older NASA JJA baseline.

ERA5-Land surface soil water (0–7 cm, m³/m³) and mean daily maximum 2m air temperature (converted Kelvin→Celsius), September 2026 versus matching 1991–2020 means, 30 complete days per region-year, ~11 km. It is modeled surface context, **not today's field/root-zone measurement**. NOAA ONI is three-month Pacific SST context: historical examples use JJA, current context JAS. Positive ONI does not itself predict a particular district's drought. Source URLs, retrieval timestamps, geographic scope, methods, resolution and raw snapshot SHA256 are embedded in public evidence metadata.

Use `scripts/evidence/export-season-history.py` and `export-surface-context.py` only explicitly with `--run` in a separate local Python environment with `earthengine-api`, ADC/operator credentials and verified project quota. They default to offline plans, have finite queries/deadlines, no task/schedule creation and no retries. The history exporter uses one multiband reduction to avoid concurrent aggregation fanout. Raw output goes under ignored `.data/research/climate/`; `build-season-pack.py` packages acquired raw CHIRPS/ERA5 and `.data/readiness/oni.txt` without network calls. Download ONI from the exact source URL recorded in the snapshot first. No paid per-view EE requests or runtime EE permissions are needed. Production serves packaged JSON through Hono. MODIS research samples are deliberately excluded: urban town-centre pixels with no crop mask cannot establish crop health.

## Crop context and decisions

`actions.json` has thirty explicit district×crop entries with historical rainfed/irrigated calendar context, 2011 source URL/page/hash and acquired VNMKV October 13, 2026 bulletin coverage for eight Marathwada districts. The bulletin forecast ends October 18; its sowing window ends October 15. Solapur/Ahilyanagar have no current bulletin acquired in this pack. Historical calendars differ by district; Nanded's table even lists a rainfed wheat window, so no universal wheat assumption is imposed. All agronomic context is **unreviewed**.

`assessSeason` is pure and receives explicit server time. It enforces matching region/crop evidence and emits regional below/at-above-baseline context, missing prerequisites, four conditional **verification tasks**, current/expired/historical-only source status, reasons and method/rule versions. Tasks vary with crop, stage, field-moisture observation, soil depth and irrigation certainty. User-reported moisture is separate from modeled surface moisture. A historical calendar or an expired bulletin cannot approve sowing. No calibrated farm-risk number, yield-loss probability, chemical/variety/dose/date prescription, independent agronomic review or measured impact is claimed. Those remain substantive gaps relative to the full brief, not completed capabilities.

## API and explanation boundary

`POST /api/v1/demo/readiness` accepts strict finite region/crop/intent/stage/soil/moisture/irrigation choices. `POST /api/v1/demo/readiness/explain` adds bounded question/history, locale and voice. Both are exact allowlisted public synthetic operations with the existing exact-Origin CORS, body bounds, overall shared rate limits and credential-omit client. All private session/CSRF/ownership behavior remains. The service recomputes the assessment; browser-supplied evidence or ownership is never trusted. Outgoing results are validated.

Google explains only the canonical assessment and chooses one/two finite visual topic IDs. The service binds all components to its own assessment; no arbitrary HTML/JSX/URLs/model measurements. Numerical facts stay in canonical cards; generated prose rejects numeric/dose/date claims. This reduces unsupported output and does not prove scientific/linguistic correctness. Existing shared model/STT/TTS budgets reserve before each paid call; no automatic paid retry. No additional framework, cloud identity, service or data warehouse was added.

## Decide extension: sourced crop options and regional stress

The assessment also carries `stress` and `cropOptions`. `stress` is an **experimental regional water-stress indicator**, not a calibrated farm-risk or loss probability. The empirical dry-rank is `(count(baseline < current) + 0.5 × count(equal)) / 30 × 100`, using the complete matching 1991–2020 rainfall and modeled surface-moisture series. High = both ranks ≤20; moderate = one; lower = neither. Thresholds are prototype design choices, not claimed reviewed agronomic thresholds. A lower indicator does not approve sowing. The dated observation window and modeled-surface limits remain visible.

`crop-guidance.json` contains seven curated, unreviewed discussion rules with source URL, exact page/section, raw SHA256 and scope. Four general crop rules come from ICAR-IIPR precision-irrigation research (gram branching/pod development), ICAR-IIMR's rabi-sorghum guide (limited one-irrigation discussion at flower-primordial/boot-leaf stage; app matches boot-leaf), and ICAR-IIWBR's wheat pocket guide (one-irrigation crown-root initiation; moisture-sensitive crown-root/flowering context). Three **district-only** historical contingencies concern Ahilyanagar wheat/chickpea alternatives, Chhatrapati Sambhajinagar gram alternatives, and Hingoli critical-stage wheat irrigation under low groundwater recharge. General crop guidance is never labeled a current district advisory. Historical source crop/variety names are context for discussion, not current seed recommendations.

The pure engine checks crop, district scope, selected stage, irrigation availability, user-reported dry-field condition, and required black/deep-soil and low-well-recharge categories. It emits `reported-context-matches`, `needs-input` or `different-context`, unmet facts and reason. “Reported context matches” means only these checked categories match; source-specific farming-system assumptions, current local suitability and independent rule review still require an adviser. No dose, operational date, automatic crop switch or prescription is produced. Other-context rules are collapsed in the farmer UI. District changes reset soil/moisture/water observations; crop changes reset stage/intent. Bulletin expiry uses the India calendar date from injected server time.

The complete thirty district/crop packs each receive applicable general crop rules plus their own district rules. This does **not** imply thirty independently reviewed district-specific contingency packs. The remaining full-brief gaps include expert-reviewed current agronomic prescriptions, calibrated farm risk, crop-masked vegetation, verified reservoir/service-area access and notified insurance deadlines. Source-backed discussion options improve the Decide layer without disguising those gaps.

Release review tightened applicability: chickpea two-stage discussion remains `needs-input` for one/limited/unknown supply until both-stage capacity is confirmed. District source conditions not collected by the form are explicit confirmation checks: open-well irrigation for Ahmednagar, source farming situation for Aurangabad/Hingoli. They cannot become reported-context matches solely from soil and well-refill selections. Hindi/Marathi cards include substantive crop guidance and missing-fact labels; experimental indicator copy explicitly says it is not a farm-loss probability estimate.

The Google inference projection excludes raw thirty-year baseline arrays, duplicate crop guidance and legacy water-climate snapshots. The engine still uses the complete baseline, and canonical cards retain the complete validated assessment. Inference receives computed evidence, source scope/limitations, crop-option conditions, missing facts and water calculation; it does not calculate risk from raw history. Seasonal explanation and optional TTS share one 35-second deadline; output-token and paid quotas remain unchanged, with no automatic retry.

## Local educational controls

Each existing model-selected evidence view now offers two or three deterministic learning controls. A matching-baseline explanation includes a year picker using the assessment’s existing totals/departures; it does not recompute climate risk in the browser. The three-step El Niño concept cites [NOAA’s ENSO explanation](https://www.noaa.gov/understanding-el-nino). Other controls distinguish dated regional records from user-reported or unknown current field moisture, historical guidance from current advice, and one hypothetical water application from whole-season demand. Source receipts retain data dates and scope. These authored English/Hindi/Marathi panels are first-party UI content, not generated facts, reviewed agronomic modules, new model topics or an A2UI/AG-UI implementation. Opening them makes no API/model call and changes no confirmed inputs or conversation entries.

The default Google model is now Gemini 3.6 Flash with its supported MINIMAL reasoning level for bounded explanation/classification. Explicit operator overrides to other configured models retain LOW. This follows [Google’s model thinking documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking); it does not promise latency. Compact context, schema/prose validation, shared paid quotas and one bounded deadline remain.

## Published crop-protection calendar (opt-in context v2)

The server-curated `protection.json` cites Maharashtra Agriculture Department's [PMFBY GR, 3 July 2026](https://krishi.maharashtra.gov.in/Site/Upload/GR/PMFBY%20GR%202026-27%20dtd%2003_07_2026.pdf), SHA256 `cc3d4d88d90657d85aab29c341031f5d553c5c4bdc9e7c3c3774d2e0114fc3b4`. PDF page 7 publishes participation dates: rabi jowar 30 November 2026; irrigated wheat and gram 15 December 2026. Page 4 establishes notified insurance-area scope; pages 24–25 cover application prerequisites/channels and retaining application copies or receipts. Dates are not planting windows, confirmed personal cutoffs or proof a farmer is eligible. No premium amounts are calculated. Not all notification annexures or subsequent amendments have been reviewed.

The pack was inspected on 18 October. `recheckOn: 2026-10-25` is a prototype freshness policy, not an official expiry date. `assessProtection` takes an injected ISO timestamp, derives India calendar date (UTC+05:30), computes days to the published date, and emits source-not-issued-yet / published-date-passed / source-recheck-needed / irrigation-context-differs / verify-eligibility. Irrigation mismatch remains independently represented when time status has priority. Individual eligibility is always `unverified`. Past dates require an extension check; the engine never infers enrollment closure or a synthetic end-of-coverage date.

The frontend gives four source-linked checks and an explicit [official PMFBY handoff](https://pmfby.gov.in/). It neither collects documents nor applies for insurance. Displayed crop/category and missing checks are canonical values. The Google explanation cannot invent dates, coverage or application success.

```mermaid
flowchart LR
  Input[Explicit contextVersion 2 and crop/irrigation] --> Assess[Pure protection assessment + India date]
  Policy[Curated state policy + dates/pages/hash] --> Assess
  Assess --> Card[Published date + unverified eligibility + checks]
  Assess --> Explain[Bounded Google explanation]
  Explain --> View[insurance-check view selection]
  View --> Card
  Card --> Handoff[User chooses official portal/bank/CSC]
```

Legacy v1 callers omit `contextVersion`; their exact response has no protection field and Google cannot select insurance-check. The named protection question requires v2. No route, authentication exception or paid quota was added.
