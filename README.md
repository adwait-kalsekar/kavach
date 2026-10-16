# Kavach

A minimal Turborepo starter for exploring and building Kavach.

## Product and research

Open the [visual product brief](docs/product/overview.html) in a browser for proposed screens and the farmer journey. The [documentation index](docs/README.md) links the product specification, source/API register, competitive review and original project brief.

## Prerequisites

- Node.js 24 LTS (24.15.0+) or Node.js 26+
- npm 12.2.0

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
