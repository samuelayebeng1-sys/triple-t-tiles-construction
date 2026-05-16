# BranchControl by ChalePay

A full-stack building materials business management app for a Ghana-based multi-branch supplier. Manages daily sales entry, real-time stock levels, warehouse operations, credit tracking, analytics, and mismatch resolution across 3 branches and 2 warehouses.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/branch-control run dev` — run the frontend (port 24600, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Recharts, wouter
- API: Express 5 + Zod validation (OpenAPI contract-first)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle ORM schema (products, stock, entries, credits, issues, settings)
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/branch-control/src/pages/` — all frontend page components
- `artifacts/branch-control/src/components/Layout.tsx` — sidebar navigation

## Architecture decisions

- Contract-first API: OpenAPI spec drives both client hooks (Orval) and server validation (Zod)
- All amounts stored as integers (GH pesewas / cents logic handled at display)
- Stock is tracked per product × location (5 locations total: 3 branches + 2 warehouses)
- Entries are immutable once locked (status = 'LOCKED')
- Issues (mismatches) are manually resolved by the owner

## Product

- **Login** — owner-only portal with demo credentials
- **Dashboard** — today's sales/profit across all branches, weekly bar chart, branch performance vs targets
- **Enter Book** — daily sales entry per branch with per-product qty, payment method (Cash/MoMo/Credit/Split), credit customer capture
- **Stock Search** — real-time stock levels per product across all 5 locations with low-stock indicators
- **Warehouses** — stock value by warehouse, receive deliveries from suppliers, inter-location transfers
- **Reports** — locked daily branch reports with cash/momo/credit/profit breakdown, export options
- **Analytics** — weekly branch comparison bar chart, heatmap, top products by revenue
- **Credit Book** — customer credit ledger with payment recording, balance tracking
- **Mismatches** — stock discrepancy log with severity levels and resolution workflow
- **Settings** — business profile, SMS notification toggles, sender ID

## Business context

- Currency: GH₵ (Ghana Cedi), locale `en-GH`
- Branches: Adenta, Spintex, Kasoa
- Warehouses: Main Warehouse, North Warehouse
- Products: 8 building materials (cement, tiles, WC units, PVC pipe, shower mixers, sinks, rebar, paint)
- Demo login: `owner_admin` / `ChalePay2026`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — each artifact needs `PORT` and `BASE_PATH` env vars wired by the workflow
- After schema changes: run `pnpm --filter @workspace/db run push` then restart the API server workflow
- After OpenAPI spec changes: run `pnpm --filter @workspace/api-spec run codegen` then restart the frontend workflow
- Vite `restart_workflow` tool needs `workflow_timeout: 90` — the tool default of 30s is too short for initial startup

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
