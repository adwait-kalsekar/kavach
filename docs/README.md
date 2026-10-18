# Kavach documentation

Start with the [visual product overview](product/overview.html). Download/open it in any browser; it is a standalone HTML document with no build, network, or API dependencies.

## Seasonal-readiness implementation

The user’s [original Kavach brief](reference/original-project-brief.md) defines the target: Sense → Compare → Decide → Explain across ten Maharashtra districts and three crops. Start with the [alignment matrix](architecture/brief-alignment.md) and [source/method architecture](architecture/season-readiness.md). These explicitly distinguish the implemented prototype from remaining scientific and source-coverage requirements.

## Active submission sprint

[Current POC implementation](architecture/poc-implementation.md) records the locally validated voice-first sample, Google integration, evidence and production limitations. The original sprint/build specifications are historical planning context; subsequent user approval added bounded voice and three languages.

[Eight-hour POC handoff](submission/README.md) is the current implementation order for the October 18 deadline. [Build/API specification](submission/build-spec.md), [cloud/model runbook](submission/cloud-and-model.md), [submission checklist](submission/submission-checklist.md) and [deck starter](submission/deck-outline.md) record the original plan and remaining submission work. The POC code is now implemented locally; rollout/deck/video/upload are separate steps.

## Index

| Document                                                                     | Purpose                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [First GCP setup: step-by-step](deployment/gcp-setup.md)                     | Project-specific Cloud Console/Cloud Shell instructions and safe credential options  |
| [GCP deployment and continuous delivery](architecture/gcp-deployment.md)     | Two-service delivery, ports/domains, container choice, recovery and keyless IAM      |
| [Web and Hono RPC foundation](architecture/web-foundation.md)                | UI/API development, type-only RPC, security boundaries and GCP packaging             |
| [API integration guide](api/README.md)                                       | Local quickstart, session flow, typed client and current API semantics               |
| [Generated OpenAPI](api/openapi.json)                                        | Versioned machine-readable request and response contracts                            |
| [Infrastructure templates](../infra/README.md)                               | Container, emulator and deferred GCP deployment setup                                |
| [Authentication follow-up](research/authentication.md)                       | Provider comparison and deferred account-login boundary                              |
| [Active backend batches](architecture/backend-foundation.md)                 | Current implementation scope, local/GCP configuration and batch reviews              |
| [Architecture entry point](architecture/README.md)                           | Locked React/Vite + Hono + Firestore stack, GCP deployment and implementation order  |
| [GCP stack decision](architecture/stack-and-gcp.md)                          | Verified hosting support, database/identity choices and deployment topology          |
| [Contracts and provider boundaries](architecture/contracts-and-providers.md) | Public API, provenance, provider substitution and failure semantics                  |
| [Implementation plan](architecture/implementation-plan.md)                   | Work packages, dependency order, acceptance gates and agent handoffs                 |
| [Product overview / interactive screen concepts](product/overview.html)      | Product story, farmer journey, screen concepts, scope and delivery sequence          |
| [Product specification](product/product-spec.md)                             | Intended behavior, inputs, acceptance criteria and open decisions                    |
| [Comparable products](research/comparable-products.md)                       | Competitive evidence and positioning implications                                    |
| [Opportunity gap review](research/opportunity-gap-review.md)                 | Evidence-backed candidate gaps, competitive counterevidence and AI Builder Cup scope |
| [Data sources and API register](research/data-sources.md)                    | Source selection, access constraints, data limitations and integration order         |
| [Original project brief](reference/original-project-brief.md)                | Unmodified user-supplied starting point; its claims are not all verified             |

## Working instructions

- `product/` contains intended behavior and design concepts. Screens are proposals, not implemented app features.
- `research/` contains externally sourced findings. Keep source URLs, review dates, evidence limits and access status beside each claim. Documented availability is not a successful API integration.
- `reference/` preserves supplied material. Record corrections in product/research documents rather than rewriting the original.
- Update this index when adding a document. Link related documents with relative paths.
- Label sample profiles, numbers, forecasts, recommendations and UI states as illustrative. Do not promote demo values into production rules.
- Do not describe agronomic guidance as reviewed until a qualified reviewer and review date are recorded. Require an applicable source/page for each production recommendation.
- Record model/data version, geography, observation period, publication time, retrieval time, units and quality flags in ingestion work.
- Keep credentials and downloaded bulk datasets outside Git. Store only source definitions, schemas, processing instructions and appropriately licensed small fixtures.
- These docs are independent of the `apps/docs` starter application. No app runtime changes are required to read them.

## Sharing across worktrees

These files are tracked on `main`. Existing feature worktrees do not update automatically after a push. From each feature worktree, fetch and merge/rebase `origin/main` according to the team's branch workflow. Avoid copying docs independently between worktrees.

Research reviewed: 17 October 2026. Product scope remains a proposal pending implementation and agronomic validation.

Architecture decision: [React/Vite + TanStack Router/Query, Hono/Node, Firestore and Cloud Run](architecture/README.md). Earlier Next.js and SQL suggestions are superseded for the initial application. The owner authorized cloud setup on 18 October; see the [live setup log](architecture/backend-foundation.md#authorized-live-setup--18-october-2026).
