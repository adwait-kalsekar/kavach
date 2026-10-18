# Architecture and implementation entry point

Decision date: 17 October 2026. Status: backend and web/health foundations implemented; farmer-facing screens, AI and live deployment remain planned. No cloud resources have been provisioned.

For the current eight-hour submission deadline, start with [the active sprint handoff](../submission/README.md). Its proposed public sample-only surface preserves the private API security boundary and defers custom domains; it is not yet implemented.

Read in order:

- [GCP deployment and continuous delivery](gcp-deployment.md): researched hosting/pipeline plan, keyless access, required owner inputs and acceptance gates. Automation is prepared; live GCP access/setup is pending.

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

GCP project is kavach-farmers-market-sense; preferred region is Mumbai. Account setup and a custom domain remain pending. Work locally with SQLite, optional emulators and explicitly labeled test fixtures until those details are supplied. Do not describe emulator verification as live GCP verification.

## Required browser boundary

User requirement: all browser service/API requests go to Hono. React assets come from an independent Nginx web service; Hono never serves the frontend. No direct auth, database, AI, weather, object-storage, telemetry or signed-upload connection is permitted from frontend code. This requirement supersedes the earlier browser-side Firebase Authentication suggestion.
