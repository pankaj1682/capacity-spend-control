# Capacity & Spend Control — User Guide

## Table of Contents
1. [What is this app?](#1-what-is-this-app)
2. [Initial Setup (First-time Admin)](#2-initial-setup)
3. [Clearing Demo / Seed Data](#3-clearing-demo-seed-data)
4. [Roles & Permissions](#4-roles--permissions)
5. [Fiscal Year (FY) Explained](#5-fiscal-year-fy-explained)
6. [Module-by-Module Guide](#6-module-by-module-guide)
   - [Dashboard](#61-dashboard)
   - [Projects](#62-projects)
   - [Resources](#63-resources)
   - [Demands](#64-demands)
   - [Allocations](#65-allocations)
   - [Budgets](#66-budget-planning)
   - [Actuals](#67-actuals)
   - [Analytics](#68-analytics)
7. [Admin Area](#7-admin-area)
   - [User Management](#71-user-management)
   - [FX Rates](#72-fx-rates)
   - [Business Functions](#73-business-functions)
   - [Audit Log](#74-audit-log)
8. [SAP CSV Import](#8-sap-csv-import)
9. [Role-by-Role Quick Reference](#9-role-by-role-quick-reference)

---

## 1. What is this app?

**Capacity & Spend Control (CSC)** is a resource planning and budget governance tool for project portfolios. It lets you:

- Track which people (resources) are allocated to which projects, and for how many days per month.
- Plan and monitor budgets (approved, forecast, actuals) broken down by project and cost type (Opex/Capex).
- Spot overallocation, skill shortages, and budget variance in real time on the dashboard.
- Import actuals directly from SAP CSV extracts.
- Maintain a full audit trail of every change made by every user.

The app uses a **July–June fiscal year** (e.g. FY26 = July 2025 – June 2026). All monetary reporting is in **USD**; resources can have rates in any currency and the system converts using the FX rates you configure.

---

## 2. Initial Setup

### Step 1 — Create the Admin account

Go to `https://<your-app-url>/signup`.

- The **first account ever created automatically becomes Admin**. All subsequent signups default to the Viewer role.
- Fill in your name, email, and a password (minimum 8 characters) and click **Create account**.
- You are now logged in as Admin.

### Step 2 — Configure FX rates (if you have non-USD resources)

Go to **Admin → FX Rates** in the sidebar.

- Add a row for each currency your resources are paid in.
- Enter the currency code (e.g. `GBP`, `EUR`, `INR`) and its current rate to USD (e.g. `1.27` for GBP).
- The USD rate is always `1` and does not need a manual entry.

### Step 3 — Add team members

Go to **Admin → Users** and click **Add User**.

- Enter their name, email, a temporary password, and assign the correct role (see [Roles](#4-roles--permissions)).
- They can then log in at `/login` with those credentials.

### Step 4 — Enter your data

Work through the modules in this order to avoid missing references:

1. **Projects** — create all your portfolio projects.
2. **Resources** — add every person/contractor you plan to allocate.
3. **Demands** — log your open resource needs per project.
4. **Allocations** — assign resources to projects, month by month.
5. **Budgets** — enter approved and forecast budgets per project, month, and cost type.
6. **Actuals** — enter actual spend (or import from SAP CSV).

---

## 3. Clearing Demo / Seed Data

The app was pre-loaded with **7 sample projects, 13 resources, 10 demands, 70 allocations, 113 budget rows, and 28 actuals rows** for demonstration purposes. There are also 2 test user accounts (`admin@example.com` and `admin2@example.com`).

### To clear all demo data and start fresh:

Ask your system administrator to run the following SQL against the production database (this is irreversible):

```sql
-- Clear all transactional data (order matters due to foreign keys)
TRUNCATE TABLE audit_logs, actuals, budgets, allocations, demands, resources, projects, fx_rates, users RESTART IDENTITY CASCADE;
```

> **Important:** This deletes every user including your Admin account. The next person to visit `/signup` will become the new Admin.

### To keep your Admin account but delete only the sample data:

If `admin@example.com` is your real account, keep it and delete only the seeded content:

```sql
-- Delete sample data (keeps users and FX rates)
DELETE FROM audit_logs;
DELETE FROM actuals;
DELETE FROM budgets;
DELETE FROM allocations;
DELETE FROM demands;
DELETE FROM resources;
DELETE FROM projects;
-- Remove only the test secondary user if desired:
DELETE FROM users WHERE email = 'admin2@example.com';
```

After clearing, the dashboard will show zeros and all list pages will be empty — ready for real data.

---

## 4. Roles & Permissions

| Role | Create/Edit | Delete | Scope |
|---|---|---|---|
| **Admin** | Everything | Everything | Full system access + user & FX management |
| **PMO Lead** | Projects, Demands, Allocations, Budgets, Actuals | Same | Full portfolio view + audit log |
| **Project Manager** | Projects under their ownership, Demands, Budgets, Actuals | Same | Projects they manage |
| **Finance Controller** | Budgets, Actuals, FX Rates | Same | Financial data + audit log |
| **Resource Manager** | Resources, Allocations | Same | Workforce data |
| **Demand Owner** | Demands | Same | Open demands only |
| **Viewer** | None | None | Read-only access to all data |

**Key rules:**
- Only **Admin** can create, edit, or delete users and change anyone's role.
- **Finance Controller** can manage FX rates and access the audit log.
- **PMO Lead** and **Finance Controller** can access the audit log.
- Buttons for actions you cannot perform are hidden automatically — you only see what you can use.

---

## 5. Fiscal Year (FY) Explained

The app uses a **July–June fiscal year**, named by the year in which it ends:

| FY label | Period |
|---|---|
| FY25 | July 2024 – June 2025 |
| **FY26** | **July 2025 – June 2026** (current) |
| FY27 | July 2026 – June 2027 |

The **FY selector** at the top of the sidebar controls which fiscal year all dashboards, budget pages, actuals pages, and allocation pages display. Changing it updates every screen instantly — no page reload needed.

Month labels in charts follow FY order (July is month 1, June is month 12).

---

## 6. Module-by-Module Guide

### 6.1 Dashboard

**Who sees it:** Everyone.

The dashboard is the home screen after login. It shows 8 KPI cards for the selected FY:

| Card | Meaning |
|---|---|
| Approved Budget | Total approved budget across all active projects |
| Forecast Budget | Total forecast spend (may differ from approved) |
| Actual Spend | Actual costs posted to date |
| Remaining Budget | Approved Budget minus Actual Spend |
| Active Projects | Count of projects with status = Active |
| Total Resources | Headcount in the resource master |
| Open Demands | Unfilled resource requests |
| Overallocated | Resources assigned >100% in any month |

**Charts on the dashboard:**
- **Budget vs Actual** — monthly bars (Actual) + lines (Forecast, Approved) for the selected FY.
- **Demand vs Capacity by Skill** — stacked bars comparing what's needed vs what's available (in FTE).
- **Multi-Year Budget** — bars for Approved, Forecast, and Actual across FY25, FY26, and FY27.
- **Opex vs Capex** — stacked area showing the monthly split of operating vs capital spend.

Change the FY using the selector in the sidebar — the dashboard updates immediately.

---

### 6.2 Projects

**Who can create/edit/delete:** Admin, PMO Lead, Project Manager.

**Fields explained:**

| Field | Description |
|---|---|
| Name | Full project name |
| Code | Short unique code (e.g. `CB-2026-001`) used in CSV imports |
| Portfolio | Grouping (e.g. Digital, Regulatory, Operations) |
| Phase | Planning / Execution / Closure |
| Status | Active / On Hold / Completed / Planned |
| Budget Owner | Name of the person accountable for budget |
| Start / End Date | Project timeline dates |
| Approved Budget | Top-down approved budget in USD |

Click **New Project** to open the form. Click the pencil icon on a row to edit. Click the bin icon to delete (this also removes all linked demands, allocations, budgets, and actuals via cascade).

Click a project name or the row to open the **Project Detail** page, which shows a timeline, resource allocation chart, and budget vs actual chart for that specific project.

---

### 6.3 Resources

**Who can create/edit/delete:** Admin, Resource Manager.

**Fields explained:**

| Field | Description |
|---|---|
| Name | Person's full name |
| Role | Job title (e.g. Senior Developer) |
| Primary Skill | Main skill (used for demand matching) |
| Location | Office or Remote |
| Rate | Day rate or monthly rate in their local currency |
| Rate Type | Daily or Monthly |
| Currency | 3-letter code of their billing currency (e.g. GBP, EUR, USD) |
| FX Rate to USD | Exchange rate used to convert their costs to USD for reporting |
| Employment Type | FTE, Contractor, or Vendor |
| Availability % | What fraction of their time is available for project work (default 100%) |
| Cost Centre | Internal cost centre code |

> **Tip on currency:** If a resource is paid in GBP at £450/day and the GBP rate is 1.27, their allocation cost in USD will be calculated as `days × 450 × 1.27`. Keep FX rates updated under **Admin → FX Rates** to keep reporting accurate.

---

### 6.4 Demands

**Who can create/edit/delete:** Admin, PMO Lead, Project Manager, Demand Owner.

A demand is an unfilled resource request: "I need a Java developer on Project X from July to September."

**Fields explained:**

| Field | Description |
|---|---|
| Project | Which project needs this resource |
| Skill Required | The primary skill needed (e.g. Java, React, Data Engineering) |
| Role Required | The job title required |
| Start / End Month | The period for which the role is needed (YYYY-MM) |
| Required FTE | How many full-time equivalents are needed |
| Priority | High / Medium / Low |
| Status | Open / Partially Filled / Filled / Cancelled |

Demands feed the **Demand vs Capacity** chart on the dashboard.

---

### 6.5 Allocations

**Who can create/edit/delete:** Admin, Resource Manager, PMO Lead.

An allocation connects a specific resource to a specific project for a specific month, recording how many days they are expected to work.

**Fields explained:**

| Field | Description |
|---|---|
| Project | Which project |
| Resource | Which person |
| Year / Month | The calendar month |
| Planned Days | Working days allocated that month |
| Allocation % | Percentage of the resource's capacity (auto-hints, manual override) |
| Rate | Day rate (auto-filled from the resource, editable) |
| Planned Cost (USD) | Calculated: `days × rate × FX rate`. Read-only. |
| Opex % / Capex % | Split of this allocation between operating and capital expenditure |
| WBS Code | SAP WBS element code for cost tracking |

The **Allocations** page is filtered by the FY selected in the sidebar. Rows outside the selected FY are hidden.

> **Overallocation warning:** If a resource's total allocation across all projects exceeds 100% in a given month, they appear in the **Overallocated** KPI on the dashboard.

---

### 6.6 Budget Planning

**Who can create/edit/delete:** Admin, Finance Controller, PMO Lead, Project Manager.  
**Who can import via CSV:** Admin, Finance Controller, PMO Lead, Project Manager.

Budget rows represent the financial plan for a project for a given month, split by cost type.

**Fields explained:**

| Field | Description |
|---|---|
| Project | Which project |
| Year / Month | The budget period |
| Cost Type | Opex or Capex |
| Approved Budget | The signed-off budget for this period |
| Forecast Budget | The current best estimate of spend |
| Planned Resource Cost | Expected cost of allocated resources |
| Non-Resource Cost | All other costs (software, hardware, travel, etc.) |

The page is filtered to the selected FY. Use the **Import Budgets CSV** button to bulk-upload from SAP (see [SAP CSV Import](#8-sap-csv-import)).

---

### 6.7 Actuals

**Who can create/edit/delete:** Admin, Finance Controller, PMO Lead, Project Manager.  
**Who can import via CSV:** Admin, Finance Controller, PMO Lead.

Actuals record what was actually spent in a given month per project.

**Fields explained:**

| Field | Description |
|---|---|
| Project | Which project |
| Year / Month | The month of spend |
| Actual Resource Cost | Actual people costs posted |
| Actual Vendor Cost | Third-party / vendor invoices |
| Actual Invoice Cost | Other invoiced costs |
| Source | Where the data came from (SAP, Manual, Estimate) |

The page is filtered to the selected FY. Use **Import Actuals CSV** to upload the SAP extract directly (see [SAP CSV Import](#8-sap-csv-import)).

---

### 6.8 Analytics

**Who sees it:** Everyone.

The Analytics page provides deeper views for a selected project:

- **Monthly Burn Rate** — how quickly the project is spending its budget month by month.
- **Resource utilisation** — which resources are working on this project and at what allocation.
- **Skill distribution** — breakdown of skills deployed on the project.

Use the Project dropdown at the top to switch projects. The FY selector in the sidebar applies here too.

---

## 7. Admin Area

The **Admin** section in the sidebar is visible only to users with Admin, Finance Controller, or PMO Lead roles.

### 7.1 User Management

**Who:** Admin only.

- **Add User** — creates a new account with a chosen role. The user will receive their email and password and can log in immediately.
- **Edit** a user's name, role, or password. Useful when someone changes teams.
- **Delete** a user — removes their login but their name remains in the audit log for historical accuracy.

> Roles can be changed at any time. Changes take effect on the user's next page load.

---

### 7.2 FX Rates

**Who:** Admin, Finance Controller.

Add or update exchange rates used to convert non-USD resource costs into USD for reporting. Format: 3-letter ISO currency code + rate to USD.

Examples:
| Currency | Rate to USD |
|---|---|
| GBP | 1.27 |
| EUR | 1.08 |
| INR | 0.012 |
| AUD | 0.65 |

Rates here are separate from the `fxRateToUsd` field on individual resources. The per-resource field is what is actually used in calculations — the FX Rates table serves as a reference and can be used to update resources in bulk if you build a reconciliation job.

---

### 7.3 Business Functions

**Who:** Admin only.

Business Functions let you partition your data by organisational unit (e.g. Marketing, Finance, HR, Inbound Supply, Work Management). Once set up, you can assign any user, project, or resource to a function to create siloed visibility.

**How it works:**
- A **user with a function** sees only projects and resources that belong to their function (and all downstream data: demands, allocations, budgets, actuals).
- A **user with no function** (or an Admin) sees all data across every function.

**Managing functions:**

Go to **Admin → Functions** in the sidebar.

- Click **New Function** to create a function — enter a display name (e.g. `Marketing`) and a slug (e.g. `marketing`). The slug auto-fills from the name.
- Use the **edit** (pencil) icon to rename or change a function's slug.
- Use the **delete** (trash) icon to remove a function. This clears the function assignment from all linked projects, resources, and users but does not delete those records.

**Assigning functions:**

| Object | Where to assign |
|---|---|
| Users | **Admin → Users** — Function column dropdown on each row |
| Projects | **Admin → Functions** assigns the function; project rows show a blue badge |
| Resources | Same — resource rows show a blue badge |

> **Tip:** Assign both the user and the relevant projects/resources to the same function. Users only see data where the project or resource is tagged with their function.

---

### 7.4 Audit Log

**Who:** Admin, PMO Lead, Finance Controller.

Every create, update, and delete action recorded in the system appears here with:
- **Date and time** of the change
- **Who made it** (name + email)
- **What action** — CREATE, UPDATE, or DELETE
- **Which entity** — project, budget, actual, resource, demand, or allocation
- **Which record** — the entity ID
- **Before / After values** — click **Show** on any row to expand a diff table. Changed fields are highlighted in red (old value) and green (new value).

**Filters:**
- **Entity** — narrow to one type (e.g. only budget changes)
- **Action** — show only CREATE, UPDATE, or DELETE
- **From / To** — date range filter

The page returns up to 300 rows per query. For larger ranges, narrow the dates.

> The audit log is read-only. Entries cannot be deleted.

---

## 8. SAP CSV Import

The system accepts SAP CSV extracts to bulk-load budgets and actuals, avoiding manual entry.

### Budget CSV

Click **Import Budgets CSV** on the Budgets page.

Expected columns (in any order, case-sensitive):

| Column | Description |
|---|---|
| `projectCode` | Must match an existing project's Code field exactly |
| `year` | 4-digit year (e.g. `2026`) |
| `month` | Month number `1`–`12` |
| `costType` | `Opex` or `Capex` |
| `approvedBudget` | Numeric |
| `forecastBudget` | Numeric |
| `plannedResourceCost` | Numeric |
| `nonResourceCost` | Numeric |

Rows are **upserted** — if a row for that project + year + month + cost type already exists it is updated, otherwise inserted.

### Actuals CSV

Click **Import Actuals CSV** on the Actuals page.

Expected columns:

| Column | Description |
|---|---|
| `projectCode` | Must match an existing project's Code field |
| `year` | 4-digit year |
| `month` | Month number `1`–`12` |
| `actualResourceCost` | Numeric |
| `actualVendorCost` | Numeric |
| `actualInvoiceCost` | Numeric |
| `source` | Free text (e.g. `SAP`, `Manual`) |

After upload, a result panel shows how many rows were inserted, updated, and whether any rows failed (with the row number and error message).

---

## 9. Role-by-Role Quick Reference

### Admin
- Full access to everything.
- Only role that can manage users and change roles.
- Can create, edit, and delete any record in any module.
- Access: Dashboard, Projects, Resources, Demands, Allocations, Budgets, Actuals, Analytics, Users, FX Rates, Audit Log.

### PMO Lead
- Manages the full portfolio: projects, demands, allocations, budgets, actuals.
- Can view and filter the audit log to review changes.
- Cannot manage users or FX rates.
- Access: Dashboard, Projects, Resources (read), Demands, Allocations, Budgets, Actuals, Analytics, Audit Log.

### Project Manager
- Manages their own projects, raises demands, maintains budgets and actuals for projects they own.
- Cannot see or manage resources, allocations, or other teams' data.
- Access: Dashboard, Projects (own), Demands, Budgets, Actuals, Analytics.

### Finance Controller
- Manages all financial data: budgets, actuals, FX rates.
- Can import SAP CSV files for budgets and actuals.
- Can view the audit log to verify financial data integrity.
- Cannot create projects or manage resources.
- Access: Dashboard, Budgets, Actuals, FX Rates, Audit Log.

### Resource Manager
- Manages the resource master (people, rates, availability) and their allocations.
- Cannot touch financial data (budgets, actuals) or project definitions.
- Access: Dashboard, Resources, Allocations, Analytics.

### Demand Owner
- Raises and updates open resource demands.
- Read-only on everything else.
- Access: Dashboard, Demands (own), Projects (read), Analytics.

### Viewer
- Read-only access to all pages.
- Cannot create, edit, or delete anything.
- Useful for stakeholders who need visibility but should not change data.
- Access: Dashboard, all pages in read-only mode.
