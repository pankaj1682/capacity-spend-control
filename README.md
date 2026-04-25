# Capacity & Spend Control

A full-stack resource planning and budget governance tool for project portfolios.

Built with **TypeScript**, **React + Vite**, **Express 5**, **PostgreSQL**, and **Drizzle ORM** — deployed as a pnpm monorepo.

---

## What It Does

- Track resource allocations across projects, month by month
- Plan and monitor budgets (approved, forecast, actuals) split by Opex/Capex
- Spot overallocation, skill shortages, and budget variance on a live dashboard
- Import actuals directly from SAP CSV extracts
- Scope data by Business Function (Marketing, Finance, HR, etc.)
- Maintain a full audit trail of every change, by every user
- Multi-currency support with USD reporting via configurable FX rates
- July–June fiscal year with a sidebar FY selector

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS, shadcn/ui, Wouter routing |
| Backend | Express 5, Drizzle ORM, connect-pg-simple sessions |
| Database | PostgreSQL |
| Auth | bcryptjs password hashing, express-session with PG store |
| API | OpenAPI 3.1 spec → Orval codegen (React Query hooks + Zod schemas) |
| Monorepo | pnpm workspaces, TypeScript project references |

---

## Repository Structure

```
.
├── artifacts/
│   ├── api-server/          # Express API (src/routes/, src/lib/)
│   └── capacity-spend-control/  # React + Vite frontend (src/pages/, src/components/)
├── lib/
│   ├── api-spec/            # OpenAPI spec (openapi.yaml) + Orval config
│   ├── api-client-react/    # Generated React Query hooks (do not edit manually)
│   ├── api-zod/             # Generated Zod schemas (do not edit manually)
│   └── db/                  # Drizzle schema + migrations
├── scripts/                 # Seed script (pnpm --filter @workspace/scripts run seed)
├── .env.example             # Environment variable template
└── USER_GUIDE.md            # End-user documentation for all roles
```

---

## Prerequisites

- **Node.js 20+** (22 or 24 recommended)
- **pnpm 9+** — `npm install -g pnpm`
- **PostgreSQL 14+** running locally or via a cloud service

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_ORG/capacity-spend-control.git
cd capacity-spend-control
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random string ≥ 32 chars for session signing |
| `NODE_ENV` | No | `development` locally, `production` when deployed |
| `PORT` | No | API server port (default 8080) |

Generate a secure `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

This creates all tables (users, projects, resources, demands, allocations, budgets, actuals, fx_rates, business_functions, audit_logs, user_sessions).

### 5. (Optional) Seed demo data

```bash
pnpm --filter @workspace/scripts run seed
```

Loads 7 sample projects, 13 resources, demands, allocations, budgets, and actuals for demonstration.

### 6. Start the development servers

**Terminal 1 — API server:**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend:**
```bash
pnpm --filter @workspace/capacity-spend-control run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` to `http://localhost:8080`.

---

## Creating the First Admin Account

1. Open the app in a browser and navigate to `/signup`.
2. The **very first account created automatically becomes Admin**. All subsequent signups default to the Viewer role.
3. Fill in name, email, and a password (minimum 8 characters) and click **Create account**.
4. You are now logged in as Admin — proceed to configure FX rates, add users, and enter data.

> If you seeded demo data, `admin@example.com` / `password123` is a pre-created Admin account.

---

## User Management & Role Provisioning

Admins manage users at **Admin → Users** in the sidebar.

### Roles

| Role | Write Access | Notes |
|---|---|---|
| **Admin** | Everything | Only role that can manage users and change roles |
| **PMO Lead** | Projects, Demands, Allocations, Budgets, Actuals | Full portfolio + audit log |
| **Project Manager** | Projects, Demands, Budgets, Actuals | Manages own projects |
| **Finance Controller** | Budgets, Actuals, FX Rates | Financial data + audit log |
| **Resource Manager** | Resources, Allocations | Workforce management |
| **Demand Owner** | Demands | Raises open resource requests |
| **Viewer** | None | Read-only across all pages |

### Creating a user (Admin only)

1. Go to **Admin → Users** → click **New User**.
2. Enter name, email, a temporary password, choose a role and optionally a Business Function.
3. Share the credentials with the user — they log in at `/login`.
4. Roles can be changed at any time and take effect on next page load.

### Business Function scoping

Assign a user to a Business Function (Marketing, Finance, HR, etc.) to restrict their view to that function's projects and resources only. Users with no function assignment see all data.

---

## API Reference

The API is documented as an OpenAPI 3.1 spec at `lib/api-spec/openapi.yaml`.

Base URL: `/api`

Key endpoints:

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create account (first becomes Admin) |
| `POST` | `/api/auth/login` | Public | Email + password login |
| `POST` | `/api/auth/logout` | Auth | End session |
| `GET` | `/api/auth/me` | Auth | Current user info |
| `GET` | `/api/healthz` | Public | Health check |
| `GET` | `/api/projects` | Auth | List projects |
| `GET` | `/api/resources` | Auth | List resources |
| `GET` | `/api/dashboard/summary` | Auth | KPI summary |
| `POST` | `/api/imports/budgets` | Auth | CSV budget import |
| `POST` | `/api/imports/actuals` | Auth | CSV actuals import |
| `GET` | `/api/functions` | Auth | List business functions |
| `GET` | `/api/audit-logs` | Admin/PMO/Finance | Audit trail |

---

## Regenerating the API Client

After modifying `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates `lib/api-client-react` (React Query hooks) and `lib/api-zod` (Zod schemas).

---

## Database Schema Changes

Edit schema files in `lib/db/src/schema/`, then push:

```bash
pnpm --filter @workspace/db run push
```

---

## Production Deployment

### Environment variables required in production

```
DATABASE_URL=<postgres connection string>
SESSION_SECRET=<long random string>
NODE_ENV=production
PORT=<assigned by platform>
```

### Build

```bash
pnpm --filter @workspace/api-server run build
```

The API server compiles to `artifacts/api-server/dist/index.mjs`. Start with:

```bash
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

The frontend is a Vite SPA — build with:

```bash
pnpm --filter @workspace/capacity-spend-control run build
```

Serve the `artifacts/capacity-spend-control/dist/` directory from any static host (Nginx, Cloudflare Pages, Netlify, etc.) and proxy `/api/*` to the API server.

### Health check

`GET /api/healthz` returns `{ "status": "ok" }` — use this for load balancer / container health probes.

### Session cookies

In production (`NODE_ENV=production`), session cookies are automatically set with `Secure: true`, requiring HTTPS. Ensure your deployment serves the app over HTTPS.

---

## Clearing Demo / Seed Data

Run this SQL against your production database (irreversible):

```sql
TRUNCATE TABLE audit_logs, actuals, budgets, allocations, demands, resources, projects, fx_rates, users RESTART IDENTITY CASCADE;
```

> This removes all users. The next `/signup` visitor becomes the new Admin.

---

## Full User Guide

See [USER_GUIDE.md](./USER_GUIDE.md) for the complete end-user documentation covering every module, role, and feature.

---

## License

MIT
