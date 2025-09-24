# NLP Service Migration

## Overview

This document describes the TypeScript migration and safety hardening performed on `services/nlp-ts`.

## Core changes

- Replaced unsafe casts like `(fastify as any)` and `globalThis` usage with typed Fastify decorations.
- Added `services/nlp-ts/src/types/fastify.d.ts` to augment `FastifyInstance` with service properties.
- Added runtime guards in route handlers to return `500` when required decorated services are missing.
- Normalized batch handling where code previously assumed `Map` vs `Array`.
- Added an in-src dev database fallback at `src/services/dev-database.ts` to allow local startup without Postgres.

## How to run

- Install dependencies at the repo root with `pnpm install`.
- To typecheck the service:

```bash
npx tsc -p services/nlp-ts/tsconfig.json --noEmit
```

- To run tests (Vitest):

```bash
cd services/nlp-ts
pnpm test
```

## Notes

- If you plan to centralize the dev DB fallback, consider moving `services/_shared-dev/database-dev.ts` into a workspace-aware package and update `tsconfig` `paths` accordingly.
