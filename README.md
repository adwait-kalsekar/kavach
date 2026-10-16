# Kavach

A minimal Turborepo starter for exploring and building Kavach.

## Prerequisites

- Node.js 24 or newer
- npm 11.9.0

## Get started

Run these commands from the repository root:

```sh
npm ci
npm run dev
```

The default apps run on ports 3000 (`web`) and 3001 (`docs`). Both use Next.js and share components from `packages/ui`.

## Checks

```sh
npm run lint
npm run check-types
npm run build
```

The starter has no automated test suite yet. Production builds and local HTTP smoke checks validate the initial apps.

## Workspace

- `apps/web`: main application
- `apps/docs`: documentation application
- `packages/ui`: shared React components
- `packages/eslint-config`: shared lint configuration
- `packages/typescript-config`: shared TypeScript configuration

Turborepo caches tasks locally. Remote caching and deployment are optional; no secrets or external services are required to develop this starter.
