# Kavach project instructions

Read and follow [AGENTS.md](AGENTS.md). It is the canonical engineering instruction file for all agents; this file intentionally links to it rather than maintaining a second divergent ruleset.

Start with [the documentation index](docs/README.md), [architecture decisions](docs/architecture/README.md) and [active backend batches](docs/architecture/backend-foundation.md).

Non-negotiable boundaries: browser → Hono only; shared runtime-validated API contracts; backend-owned sessions and cloud credentials; explicitly separate local SQLite from production Firestore; no fabricated observations or agronomic review claims. Update docs/diagrams with every architecture change and review each implementation batch before continuing. UI and GCP provisioning are deferred for this backend foundation.
