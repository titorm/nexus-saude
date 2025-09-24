# Data Warehouse Migration

## Overview

Describes TypeScript hardening and dev-fallbacks applied to `services/data-warehouse-ts`.

## Core changes

- Added an in-src dev database fallback at `src/services/dev-database.ts` so the service can start locally when external DB is unavailable.
- Ensured Fastify decorations are used to expose services to routes.
- Added minimal methods on the dev DB used by health and status endpoints.

## How to run

- Typecheck:

```bash
npx tsc -p services/data-warehouse-ts/tsconfig.json --noEmit
```

- Start locally (will use dev fallback if DB unreachable):

```bash
cd services/data-warehouse-ts
pnpm dev
```
