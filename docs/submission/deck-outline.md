# Kavach — proposal deck starter

Convert these eight slides into a presentation and export **PDF**. Replace bracketed fields with actual, verified submission URLs and implementation status. This Markdown is a content starter, **not an already generated PDF**.

## 1. Kavach: plan around the resources you actually have

Sustainability & Social Impact. A constraint-aware planning assistant for a Latur/chickpea demonstration.

Team: [registered team]. Live prototype: [public web URL]. Public source: [reviewed public repository]. Demo video: [public under-three-minute URL].

## 2. The problem

Weather and advisory information exists, but an option may assume irrigation, seed or field observations the farmer does not have. Our question is narrower: “Which planning checks change when my available water changes?” This is a plausible product opportunity, not yet a validated claim about all farmers or a novel feature absent from competitors.

## 3. The demonstration

A labelled synthetic Latur/chickpea scenario starts with one irrigation and unknown moisture. Structured checks explain what remains uncertain. A Google model explains those checks. Changing irrigation to none produces a hypothetical comparison without changing saved farm facts. Include actual screenshots only after implementation.

## 4. Why GenAI belongs here

The deterministic engine owns checks and constraints. The Google model translates that structured result into a short explanation, identifies missing facts and explains the scenario difference. The model cannot invent measurements, approve sowing, change readiness or write a farmer plan. Show actual provider/model metadata. Do not claim autonomous tools unless implemented and demonstrated.

## 5. Technical implementation

React/Vite + TanStack Router/Query → Hono API → pure decision engine + server-only Google model adapter. Independent Cloud Run web/API services and runtime identities. Firestore stores operational quotas/cache and already-built private record infrastructure. Shared Zod/OpenAPI/RPC contracts, exact public-demo CORS, bounded paid inference and no browser cloud SDKs.

Include the diagram from [build plan](build-spec.md) / [architecture](../architecture/gcp-deployment.md), labelled with current implementation status. The sample demo itself is stateless; it does not claim to save a real farmer's plan.

## 6. Value and differentiation

Emphasize feasibility-aware comparison and explicit missing facts, rather than another generic chatbot or a fabricated climate-risk percentage. Compare thoughtfully with existing FarmerChat, MahaVISTAAR and advisory products using [research](../research/opportunity-gap-review.md). No pilot, yield gain or causal impact is established. Proposed evaluation: users understand the changed constraint and next verification step.

## 7. Feasibility, operating limits and growth

One district/crop and finite sample inputs keep the prototype reviewable. Scalable services and provider/repository ports support later extension; capacity and cost are not yet benchmarked. Next steps: domain-backed private guest flow, agronomist-reviewed rules, verified evidence feeds, and user/adviser validation. Accounts, speech, satellite analytics and regional coverage remain future scope.

## 8. Evidence and honest limits

Show the actual test/deployment/model evidence, then list remaining limits: synthetic persona, unreviewed workflow rules, no precise field measurement, no validated drought/yield prediction, no guaranteed weather availability. Link official source material and the deployed demo. Close with the specific next validation step, not an unsupported impact promise.
