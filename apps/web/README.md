# Kavach web

React 19 + Vite + TanStack Router/Query. Run `npm run dev` from the repo root for both web and API; open http://localhost:3000. See [web/RPC architecture](../../docs/architecture/web-foundation.md) for the development flow, security rules and GCP container.

`src/router.tsx` owns routes and the app shell. `src/features/health/health-query.ts` owns the typed RPC call and query key. `health-page.tsx` renders truthful pending/error/success states. `styles.css` uses local system fonts and mobile layouts; no external assets or telemetry are loaded.

Use only `@kavach/api-client` for service transport. Never import backend runtime modules or place credentials in Vite configuration. Run the root boundary, type and browser checks before publishing.
