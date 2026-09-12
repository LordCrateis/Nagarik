# Nagarik

Nagarik is a synthetic citizen-benefits navigator that evaluates eligibility, detects conflicts, optimizes a compatible support bundle, and creates a document-first application checklist.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/jansahay-ai` — React/Vite frontend with landing, profile intake, and results routes
- `artifacts/api-server/src/lib/schemes.ts` — synthetic scheme catalog and data-driven criteria
- `artifacts/api-server/src/lib/benefit-engine.ts` — eligibility, conflict, optimization, document, and checklist services
- `artifacts/api-server/src/routes/benefits.ts` — benefits API routes
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `README.md` — product overview and demo instructions

## Architecture decisions

- The core engine is deterministic and local so a hackathon demo never depends on an LLM or government API.
- Scheme data is explicitly synthetic and the UI carries a prototype disclaimer throughout the experience.
- Session profile/checklist state is in memory for the prototype; the API boundaries are kept ready for a future PostgreSQL persistence layer.
- Bundle scoring intentionally combines benefit value, need match, document readiness, and category diversity rather than returning every eligible scheme.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
