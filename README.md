# Nagarik

Nagarik is a prototype citizen-benefits navigator. It takes a synthetic citizen profile, evaluates a local catalog of synthetic government-style schemes, detects incompatible combinations, selects an optimized bundle, identifies missing documents, and creates an application checklist.

> **Prototype notice:** All people, schemes, benefit amounts, and eligibility rules in this project are synthetic demo data. This is not an official government portal and should not be used as an eligibility determination.

## Problem

People can be eligible for several forms of public support, but the rules are difficult to compare. A plain list of schemes does not explain which benefits can be combined, which option is stronger, or what a person needs to prepare before applying.

## Solution

Nagarik presents a clear decision path:

1. Citizen profile
2. Eligibility analysis
3. Eligible schemes
4. Conflict detection
5. Bundle optimization
6. Recommended benefits
7. Missing documents
8. Application checklist

The main demo profile is a low-income student and produces a repeatable result of 8 possible matches, 2 detected conflicts, 4 recommended benefits, and a document-first checklist.

## Architecture

- `artifacts/jansahay-ai` — React + TypeScript + Vite frontend
- `artifacts/api-server` — Express API server
- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/api-client-react` — generated React Query hooks
- `lib/api-zod` — generated request/response validation schemas
- `artifacts/api-server/src/lib/schemes.ts` — synthetic scheme catalog and eligibility criteria
- `artifacts/api-server/src/lib/benefit-engine.ts` — eligibility, conflicts, optimization, documents, and checklist services

The prototype uses deterministic in-memory session state so the demo works immediately without an external government API or a separate data import. The API server is structured so the catalog and session records can move to PostgreSQL later.

## Tech stack

- React, TypeScript, Vite, Wouter
- Tailwind CSS
- Express 5
- Zod-generated API validation
- Orval-generated React Query hooks
- PostgreSQL-ready workspace conventions

## How eligibility works

Each synthetic scheme contains:

- human-readable eligibility rules
- required documents
- conflict relationships
- stackable scheme relationships
- benefit value and priority
- application steps

The deterministic engine evaluates each criterion and returns `eligible`, `not_eligible`, or `missing_information`, with concise reasons instead of exposing internal chain-of-thought.

## How optimization works

The bundle optimizer ranks eligible schemes using:

- benefit value
- profile need match
- priority
- document readiness
- category diversity
- compatibility

It selects the best compatible set of up to four schemes, removes conflicts, and returns two alternative combinations for comparison. The score is normalized to 100 and the recommendation includes plain-language reasons.

## API endpoints

Base path: `/api`

- `GET /api/healthz`
- `GET /api/schemes`
- `GET /api/schemes/:id`
- `GET /api/demo-profiles`
- `POST /api/citizen/profile`
- `POST /api/analyze`
- `POST /api/eligibility`
- `POST /api/conflicts`
- `POST /api/optimize`
- `GET /api/checklist/:citizenId`

## Run locally

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
```

The project workflow starts the frontend separately:

```bash
pnpm --filter @workspace/jansahay-ai run dev
```

For repository checks:

```bash
pnpm run typecheck
```

## Demonstrate the project

1. Open Nagarik at the root preview.
2. Choose **Student / low income** from the one-click demo profiles.
3. Continue through the three profile steps.
4. Select **Find my possible benefits**.
5. Show the results summary: possible matches, bundle value, documents to find, compatibility conflicts, recommended bundle, alternatives, and checklist.
6. Open **View rules** on a recommended scheme to show the scheme detail request.

The demo does not request real identity numbers, document uploads, or sensitive personal information.
