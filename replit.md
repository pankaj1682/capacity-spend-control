# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Capacity & Spend Control

Resource Planning, Demand & Budget Control web app for a non-developer PM.

### Modules
- Project Portfolio (CRUD)
- Resource Master (CRUD)
- Demand Management (CRUD)
- Resource Allocation (CRUD with planned cost computation)
- Budget Planning (CRUD with Opex/Capex split, Remaining/Variance)
- Actual Spend Tracking (CRUD with cost rollup)
- Dashboards: KPI summary, Budget vs Actual (monthly/project), Demand vs Capacity, Multi-Year, Opex vs Capex, Utilization, Overallocation, Skill Shortage, Burn Rate

### Architecture
- Backend: `artifacts/api-server` Express + Drizzle on Postgres. Routes under `src/routes/{auth,users,fxRates,imports,projects,resources,demands,allocations,budgets,actuals,dashboard}.ts`. Auth middleware in `src/lib/auth.ts` (express-session + connect-pg-simple table `user_sessions`, bcrypt hashing). FY helpers in `src/lib/fy.ts` (Jul–Jun, named by ending year).
- Frontend: `artifacts/capacity-spend-control` (React + Vite + Tailwind + shadcn). Wouter routing. Pages under `src/pages/`. Auth/FY contexts in `src/components/{auth-context,fy-context}.tsx`. Protected route + role gating: `src/components/{protected-route,role-gate}.tsx`. Sidebar: `src/components/app-sidebar.tsx`. SAP CSV upload: `src/components/import-dialog.tsx`. Helpers in `src/lib/utils.ts`.
- API spec: `lib/api-spec/openapi.yaml`. Codegen via Orval to `lib/api-client-react` and `lib/api-zod`. `customFetch` sends `credentials: 'include'`.
- DB schemas: `lib/db/src/schema/{users,fxRates,projects,resources,demands,allocations,budgets,actuals}.ts`. Resources have `currency` + `fxRateToUsd` (default USD/1).
- Seed: `pnpm --filter @workspace/scripts run seed` (loads 7 projects, 12 resources, demands, monthly allocations Apr–Aug 2026, budgets full-year 2026 + 2025/2027 partials, actuals Jan–Apr 2026).
- Drizzle numeric columns require `String()` on insert/update; routes serialize back to `Number` in responses.

### Auth & Roles
- Session cookie name `csc.sid`; `SESSION_SECRET` required. Routes call `req.session.save(cb)` after login/signup to persist before responding.
- Roles: Admin, PMO Lead, Project Manager, Finance Controller, Resource Manager, Demand Owner, Viewer. First signup becomes Admin; all others default to Viewer (Admin can change roles via `/admin/users`).
- `requireAuth` + `requireRole(...)` gate write routes. Frontend `<RoleGate roles={[...]}>` hides New/Edit/Delete buttons.
- Admin pages: `/admin/users` (Admin), `/admin/fx-rates` (Admin, Finance Controller).

### FY & Currency
- Fiscal year: Jul–Jun, named by ending year (FY26 = Jul 2025 – Jun 2026). `fy` query param on dashboard + list endpoints; backend uses `fyRange(fy)` to filter.
- Resource rates stored in resource currency. Allocation `plannedCost` and dashboard rollups multiply by `resource.fxRateToUsd` to report in USD.
- FX rates table is the source of truth for currency conversions; managed at `/admin/fx-rates`.

### Audit Log
- Table `audit_logs`: id, userId (FK→users), userEmail, userName, action (CREATE/UPDATE/DELETE), entity (project/budget/actual/resource/demand/allocation), entityId, oldValues (jsonb), newValues (jsonb), createdAt.
- Helper `artifacts/api-server/src/lib/audit.ts` — `logAudit(req, action, entity, entityId, oldValues?, newValues?)`. Fires and forgets (errors logged but don't break the main response).
- All write routes (POST/PATCH/DELETE) for projects, budgets, actuals, resources, demands, allocations call `logAudit`. PATCH handlers fetch the old row first to populate oldValues.
- GET `/api/audit-logs` — requires Admin, PMO Lead, or Finance Controller — supports query params: `entity`, `action`, `userId`, `from`, `to`, `limit`, `offset` (default limit 200).
- Frontend page at `/admin/audit-logs`: filter bar (entity, action, date range), scrollable table, expandable rows showing before/after diff table with changed fields highlighted red/green.

### SAP CSV Import
- Endpoints: `POST /api/imports/budgets` and `POST /api/imports/actuals` (multipart, field `file`).
- Upserts by `(projectCode, year, month, costType)` for budgets, `(projectCode, year, month)` for actuals. Frontend uses `<ImportDialog>` with template column hint and result panel.

### Conventions
- No emojis in UI.
- Theme: emerald/mint, off-white background, dark sidebar.
- Frontend imports hooks from `@workspace/api-client-react`, zod schemas from `@workspace/api-zod`.
- Forms: react-hook-form + `@hookform/resolvers/zod` + dialog-based create/edit.
- Chart month axes use Jul..Jun labels for FY-aware charts; calendar months Jan..Dec for multi-year/year charts.
