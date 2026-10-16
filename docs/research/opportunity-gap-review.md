# Opportunity gap review: Kavach for AI Builder Cup

Reviewed 17 October 2026. Scope: the current product overview and specification, public competitor material, published farmer research, and the competition website. No farmer interviews, competitor hands-on tests, agronomic validation or market validation were performed. Proposed opportunities are hypotheses, not proven unmet markets.

## Recommendation

Build a constraint-aware seasonal action planner for rain-dependent farmers, demonstrated with one reviewed crop/district scenario. El Niño provides context; the product's value must survive a neutral ENSO year. The critical behavior is a meaningful change in feasible actions when water, inputs or timing constraints change.

Public evidence supports problems in acting on agricultural advice. It does not establish that Kavach uniquely solves them or that the current Latur/chickpea scenario has sufficient local demand and evidence.

## Evidence and competitive counterevidence

| Source | Finding relevant to the opportunity | Limits |
| --- | --- | --- |
| [Southern India AAS study](https://www.frontiersin.org/journals/sustainable-food-systems/articles/10.3389/fsufs.2023.1284880/full), 2023, constraints section | Among 280 respondents in Kurnool/Anantapur, timely input availability ranked highest among adoption constraints; understanding, clarification and fit also mattered. Extension workers helped resolve doubts. | Observational, regional study. Does not establish current Latur prevalence or a causal product effect. |
| [J-PAL forecast evaluation](https://www.povertyactionlab.org/evaluation/impact-long-range-weather-forecasts-farmers-india?lang=en), Telangana | A randomized forecast evaluation addresses consequential pre-season investment decisions; the discussion identifies land, labor and credit constraints. | Kharif/monsoon context cannot directly validate rabi chickpea or our forecast engine. |
| [IMD Voices from the Field](https://imdagrimet.gov.in/Files/Kalp_Sankalp/Final_merge_Voices.pdf), January 2026, conclusion/way forward | Existing GKMS services already translate weather into local crop guidance; further personalization and decision-support improvements are planned. | Provider feedback/success compilation, not independent causal validation. Contradicts a blanket claim that no actionable advice exists. |
| [Digital Green FarmerChat V2](https://www.digitalgreen.org/insights/v2-launch-performance) | Clarifying questions, voice and repeat engagement are existing work; helping farmers act is a stated next direction. | Provider-reported findings and roadmap. An action workflow is a contested opportunity, not an untouched category. |
| [60 Decibels FarmerChat research](https://60decibels.com/insights/farmers-ai-recommendations/) | Research reports substantial self-reported action; a subset experiences technical issues or overly complex/long answers. | Reported use does not prove yield effects. Counterevidence to assuming AI advice is broadly unusable or untrusted. |
| [MahaVISTAAR-AI government app listing](https://play.google.com/store/apps/details?hl=en&id=in.gov.mahapocra.mahavistaarai) | Maharashtra already offers weather, agromet and expert-advice features through a government app. | Feature listing, not quality testing. Essential local competitor to evaluate. |
| [Fasal](https://www.fasal.co/) | Sensor-linked moisture monitoring, irrigation advice and automation exist. | Kavach can explore a no-new-hardware segment, but must accept lower precision. |
| [DeHaat farmer offering](https://agrevolution.in/solution-for-farmers) and [business model](https://agrevolution.in/business-model) | Advisory is connected to inputs, local centers, expert access and other services. | Advice-to-action integration is already served in parts of the market; local coverage and fit need testing. |

## Ranked candidate gaps

### 1. Advice is available, but the recommended action is infeasible

Example question: “The guidance assumes irrigation or a seed variety I cannot obtain. Which supported options remain?”

Build: confirm actual water access, relevant input availability and timing; display applicable alternatives with prerequisites; identify the bottleneck; escalate unsupported decisions with a useful context summary. A budget field should only affect recommendations when cost data and reviewed mappings support it.

Evidence strength: strongest candidate in this review. Competitive uniqueness: unproven; DeHaat and FarmerChat overlap. Software can identify and help coordinate around constraints, but cannot create water, credit or seed stock.

Demo test: compare two otherwise identical profiles with different irrigation/input constraints. The action eligibility and rationale must change substantively. Do not use a hardcoded canned answer for each screen state.

### 2. A recommendation is difficult to turn into a completed, revisitable decision

Build: a short decision card containing the next step, prerequisite, supporting guidance, check-in condition, completion status and reason for inability to act. Reassess when confirmed context or relevant evidence changes. Route unresolved cases to an adviser with context, not just “ask an expert.”

Evidence strength: plausible synthesis of execution barriers and clarification needs. The incremental benefit of persistent plans versus good conversation remains unproven. Competitors already offer reminders, monitoring and repeated conversations; test actual differences.

Demo test: farmer marks “cannot do this”; the app captures why, checks alternatives, retains the decision and explains a later revision. For a hackathon use an explicitly labeled scenario change or replay, not a fabricated live weather event.

### 3. Regional evidence does not establish a field's immediate readiness

Build: separate known regional signals from unknown field conditions; request the minimum locally meaningful observation; record its provenance; support an adviser verification task. Use conditional recommendations until the required facts are established.

Evidence strength: clear limitation of selected datasets; local user demand still requires validation. This is a product boundary and trust mechanism, not a promise of higher accuracy. Sensor-free operation cannot deliver sensor-level precision.

Demo test: show that a missing required field condition prevents an exact recommendation, and that a confirmed observation unlocks an applicable reviewed rule.

## Review of the current HTML

- Keep the short onboarding, constraint question, source drawer and transparent limits.
- Replace generic “check/discuss/review” plan placeholders with one demonstrably applicable reviewed decision flow. An adviser referral needs a concrete unresolved question and attached context.
- Show a comparison between feasible options rather than relying on an elevated concern label. Avoid invented numerical loss estimates or savings.
- Give plan revision and “I cannot do this” a visible role. These are closer to the opportunity than historical charts alone.
- Add MahaVISTAAR, Fasal and DeHaat to the competitive context. Local language, personalization and irrigation advice cannot be claimed as novel in isolation.
- Treat provenance as supporting infrastructure; whether farmers themselves want a source drawer is a usability hypothesis. It may be most valuable to reviewers/advisers.
- Preserve the distinction between a designed concept and an implemented product. Current HTML contains no live assessment or agronomic service.

## Hackathon constraints and build recommendation

The [official requirements and judging page](https://aibuildercup.com/themes.html) calls for a functional Google-AI/agentic prototype deployed via Cloud Run or Firebase, plus a PDF proposal and a three-minute public demo. Weights: technical/GenAI 40%, impact 25%, innovation 25%, UX 10%. The [homepage](https://aibuildercup.com/) lists 18 October 2026 as the submission deadline; check the entrant dashboard for cutoff time and any updates.

Use the Sustainability & Social Impact theme. Prioritize one complete, evidence-grounded interaction. Gemini should gather missing context, call assessment/action tools and explain why an option changed. Rule applicability, numeric evidence and source references stay structured and inspectable. This gives GenAI a meaningful role without granting it unchecked agronomic authority.

Suggested demonstration: farmer describes a planned crop → assistant clarifies water and timing → assessment shows evidence limits → reviewed plan → farmer reports an unavailable resource → tool-backed feasible alternative or precise escalation → saved decision card. One state/crop scenario is enough if it is real and complete; map-heavy coverage and institutional dashboards can wait.

## Fast validation before locking the product claim

Suggested discovery sample, not a statistically representative study: 5–8 intended farmers and 2–3 local advisers. Ask for the last real advisory they could not follow, what blocked it, where they sought clarification, and what they actually did. Test that exact question in MahaVISTAAR and FarmerChat where access permits. Compare against current official advice and an adviser-assisted baseline.

Keep a scenario only if: the decision matters now; users report a concrete unresolved constraint; we have applicable guidance and evidence; the prototype adds a useful step beyond existing alternatives. Revise scope if the issue is primarily resource availability that software cannot address or an existing service already resolves it well.

Unresolved: local need, agronomic rule coverage, expert/pilot access, forecast skill, distribution and institutional willingness to pay. No public research substitutes for these checks.
