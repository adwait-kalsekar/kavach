# Architecture and implementation entry point

Decision date: 17 October 2026. Updated 18 October: the voice-first public sample is implemented and validated locally. The deployed main release remains the earlier health foundation until the next rollout. See [current POC architecture and verification](poc-implementation.md) for the sample, historical rainfall and Google speech/explanation flow. See the [live infrastructure setup log](backend-foundation.md#authorized-live-setup--18-october-2026) for verified hosting.

Read in order:

- [GCP deployment and continuous delivery](gcp-deployment.md): two-service hosting, keyless access and acceptance gates. Provisioning and the first live health-foundation rollout are verified.

- [Web foundation and Hono RPC](web-foundation.md): current React/Vite setup, browser boundaries, GCP packaging and verification.

0. [Active backend foundation](backend-foundation.md): current batch scope, diagrams, local SQLite refinement and review status. Backend/contracts precede UI migration by latest user instruction.

1. [Stack and GCP deployment decision](stack-and-gcp.md): locked technology choices, deployment topology, persistence, identity and verified platform support.
2. [Contracts and provider boundaries](contracts-and-providers.md): dependency rules, service contracts, data provenance, lifecycle and failure semantics.
3. [Implementation plan](implementation-plan.md): sequenced work packages, acceptance gates and agent handoff instructions.

These decisions supersede earlier suggestions to retain Next.js or use PostgreSQL/Drizzle for the initial application. The product/research documents describe intended behavior and evidence; they are not implementation-status reports.

## Locked choices

- React + Vite + TanStack Router + TanStack Query, TypeScript throughout.
- Hono with the Node.js adapter; Node.js 24 LTS baseline, pinned consistently in development, CI and container build.
- Firestore Standard edition in Native mode for operational document data; backend-only database access.
- Gemini through Vertex AI using the service identity of the GCP workload, subject to model availability/quota verification.
- Two independent Cloud Run services for web static hosting and Hono, each with its own hostname; `/api/v1/*` is the stable API boundary.
- Hono-managed guest sessions for low-friction saved-plan ownership; opaque HTTP-only cookies and server-derived owner IDs. No browser Firebase/Auth/Firestore/model SDK or direct service connection.
- Keep the existing npm/Turborepo setup. Do not add another package manager or deploy to another cloud.

GCP project is kavach-farmers-market-sense; region is Mumbai. Account access, billing, provisioning and the first application rollout are verified. A custom domain remains deferred. Local development uses SQLite, optional emulators and explicitly labeled fixtures. Do not describe emulator verification as live GCP verification.

## Required browser boundary

User requirement: all browser service/API requests go to Hono. React assets come from an independent Nginx web service; Hono never serves the frontend. No direct auth, database, AI, weather, object-storage, telemetry or signed-upload connection is permitted from frontend code. This requirement supersedes the earlier browser-side Firebase Authentication suggestion.

The current seasonal-readiness POC is documented in [methods and data](season-readiness.md) and the [original-brief alignment matrix](brief-alignment.md). Use those for current evidence/rule scope and explicit unfinished scientific requirements; earlier deadline documents describe the initial water-planning slice.
