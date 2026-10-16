# Kavach product specification

Status: proposed product; no operational advisory capability implied. Updated 17 October 2026.

Implementation architecture is selected separately: [React/Vite frontend, Hono API and Firestore on GCP](../architecture/README.md). Earlier implementation sketches are provisional; see the [implementation plan](../architecture/implementation-plan.md) for actual status and next steps.

See the [visual overview](overview.html), [source register](../research/data-sources.md), and [competitor review](../research/comparable-products.md).

## Product promise

Help rain-dependent farmers understand seasonal water and heat concerns, explore choices for a particular crop, and revisit a practical plan as conditions change. El Niño is a contextual signal and initial use case, not a local drought prediction.

## First user and decision

Synthetic persona: Sunita, three acres near Latur, Maharashtra, considering rabi chickpea with limited irrigation. Her question: “What should I consider before sowing, given the water I have?” Start with one district and crop; add the original brief's ten districts and three crops only after coverage and rules are verified.

## Farmer journey and screens

1. **Welcome and context:** language, village/district, crop, intended sowing date or current stage, irrigation availability. Optional area and soil type if known. Do not require a phone number or precise field boundary for the prototype. Confirm speech-extracted facts; ask only for missing decision-critical inputs.
2. **Season readiness:** separate water-stress and heat indicators, forecast uncertainty, evidence freshness and resolution. Explain which inputs drove the assessment. A district estimate must not be presented as a field measurement.
3. **Plan:** up to three prioritized, source-backed actions with timing/conditions, prerequisites, rationale and confidence limitations. Unsupported questions produce a specific local-check or expert-referral step.
4. **Conversation / compare constraints:** farmer changes irrigation availability or sowing context. Recompute the structured decision result, show what changed, and retain the source trail. Do not treat hypothetical changes as saved facts without confirmation.
5. **Evidence drawer:** readable source title, observation period, release date, geography, units, method and source link. Historical comparisons are descriptive and carry sample size and baseline.
6. **Saved plan:** preserve a dated assessment snapshot; share a compact text/card. Later, opt-in notifications flag meaningful changes and explain why a plan was revised. Notification delivery is outside initial MVP.

## Core service contracts

- `FarmContext`: location ID/resolution, crop, stage or sowing window, irrigation constraint, language, confirmed inputs.
- `EvidenceRecord`: dataset/version, variable, units, geography/resolution, observation period, issued/retrieved timestamps, quality flags, source URL.
- `Assessment`: separate hazard indicators, contributing evidence IDs, missing/stale data, method/rule version and uncertainty explanation. Do not label an uncalibrated category as a loss probability.
- `ActionRule`: district/agroclimatic applicability, crop/stage, conditions, exclusions, recommendation, timing/prerequisites, source/page, validity, reviewer/status.
- `PlanSnapshot`: confirmed context, evidence IDs, assessment, selected actions, generated explanation, creation time and version.

## Decision and explanation boundary

Source adapters → normalized observations and forecasts → features against consistent baselines → reviewed rules → structured assessment/actions → Gemini explanation. AI can collect context and explain returned results; it cannot create missing measurements, unsupported deadlines or recommendations. Validate numeric statements and action references against the returned result. Log unsupported cases for review.

## MVP acceptance criteria

- One complete crop/district journey works with real, dated evidence and appropriately sourced guidance.
- Changing irrigation availability either changes the applicable plan with a stated reason or explains why it does not.
- Each displayed number resolves to an evidence record. Each action resolves to an applicable source passage and rule version.
- Stale/missing feeds are visible, and the engine withholds decisions that need unavailable evidence.
- Historical comparisons use compatible periods, units, baselines and dataset versions; no selective four-year probability claims.
- Hindi/Marathi output preserves numbers, conditions, crop names and uncertainty; native-speaker evaluation is required before field use.
- A reviewer can reconstruct a plan from stored context, evidence and rule versions.

## Priorities

**First:** context collection, dated conditions, reviewed chickpea rules for Latur, action card, text conversation, evidence drawer.

**Next:** validated voice, save/share, expert review UI, plan refresh and additional crop/district coverage.

**Later:** opt-in notifications, FPO/KVK workspace, WhatsApp/IVR delivery, partner APIs, institutional dashboard and region packs. Partner integrations are prospective, not secured.

## Validation and success

Before building a broader score, have an agronomist review scenario/action mappings. Compare historical hazard indicators with held-out seasons and district crop outcomes; account for changing yield trends and irrigation. Evaluate historical forecasts available at decision time, not later observed weather, when testing predictive performance.

Prototype measures: context completion, correct understanding of the plan, evidence traceability, expert-rated applicability, unsupported-answer behavior and language quality. Pilot measures: decisions changed, actions completed, repeat use and delivery cost. Avoided losses require a designed comparative study; do not claim them from engagement.

## Open decisions

- Qualified local agronomy reviewer and pilot FPO/KVK partner.
- Actual feed freshness, credentials, commercial terms and local forecast skill.
- Operational definition and validation method for each hazard indicator.
- Which sourced chickpea decisions can be supported now; exact dates/varieties need current local validation.
- Farmer consent, retention and access controls before collecting real personal data.
