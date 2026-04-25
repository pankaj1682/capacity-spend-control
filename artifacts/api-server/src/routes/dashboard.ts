import { Router, type IRouter } from "express";
import {
  db,
  projectsTable,
  resourcesTable,
  demandsTable,
  allocationsTable,
  budgetsTable,
  actualsTable,
} from "@workspace/db";
import { and, eq, sql, gte, lte, or } from "drizzle-orm";
import { fyOf, fyMonthIndex, fyRange } from "../lib/fy";

const router: IRouter = Router();

type FilterCol = typeof budgetsTable.year | typeof actualsTable.year | typeof allocationsTable.year;
type MonthCol = typeof budgetsTable.month | typeof actualsTable.month | typeof allocationsTable.month;

function fyWhere(yearCol: FilterCol, monthCol: MonthCol, fy: number) {
  const r = fyRange(fy);
  return or(
    and(eq(yearCol, r.startYear), gte(monthCol, r.startMonth)),
    and(eq(yearCol, r.endYear), lte(monthCol, r.endMonth)),
  );
}

function parseFy(req: { query: Record<string, unknown> }): number | undefined {
  const v = req.query["fy"] ?? req.query["year"];
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

router.get("/dashboard/summary", async (req, res) => {
  const fy = parseFy(req);
  const budgetWhere = fy ? fyWhere(budgetsTable.year, budgetsTable.month, fy) : undefined;
  const actualWhere = fy ? fyWhere(actualsTable.year, actualsTable.month, fy) : undefined;

  const [budgetTotals] = await db
    .select({
      approved: sql<string>`COALESCE(SUM(${budgetsTable.approvedBudget}), 0)`,
      forecast: sql<string>`COALESCE(SUM(${budgetsTable.forecastBudget}), 0)`,
    })
    .from(budgetsTable)
    .where(budgetWhere);

  const [actualTotals] = await db
    .select({
      actual: sql<string>`COALESCE(SUM(${actualsTable.actualResourceCost} + ${actualsTable.actualVendorCost} + ${actualsTable.actualInvoiceCost}), 0)`,
    })
    .from(actualsTable)
    .where(actualWhere);

  const [activeProjects] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(projectsTable)
    .where(eq(projectsTable.status, "Active"));

  const [resourceCount] = await db.select({ count: sql<string>`COUNT(*)` }).from(resourcesTable);

  const [openDemands] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(demandsTable)
    .where(sql`${demandsTable.status} IN ('Submitted','Approved','Draft')`);

  const overallocatedRows = await db
    .select({
      resourceId: allocationsTable.resourceId,
      year: allocationsTable.year,
      month: allocationsTable.month,
      total: sql<string>`SUM(${allocationsTable.allocationPct})`,
    })
    .from(allocationsTable)
    .groupBy(allocationsTable.resourceId, allocationsTable.year, allocationsTable.month);

  const overallocatedCount = overallocatedRows.filter((r) => Number(r.total) > 100).length;

  const approved = Number(budgetTotals!.approved);
  const forecast = Number(budgetTotals!.forecast);
  const actual = Number(actualTotals!.actual);

  res.json({
    totalApprovedBudget: approved,
    totalForecastBudget: forecast,
    totalActualSpend: actual,
    totalRemaining: approved - actual,
    activeProjects: Number(activeProjects!.count),
    totalResources: Number(resourceCount!.count),
    openDemands: Number(openDemands!.count),
    overallocatedCount,
  });
});

router.get("/dashboard/budget-vs-actual", async (req, res) => {
  const fy = parseFy(req);
  const projectId = req.query["projectId"] ? Number(req.query["projectId"]) : undefined;

  const budgetWhere = [];
  if (fy) budgetWhere.push(fyWhere(budgetsTable.year, budgetsTable.month, fy));
  if (projectId) budgetWhere.push(eq(budgetsTable.projectId, projectId));

  const actualWhere = [];
  if (fy) actualWhere.push(fyWhere(actualsTable.year, actualsTable.month, fy));
  if (projectId) actualWhere.push(eq(actualsTable.projectId, projectId));

  const budgetRows = await db
    .select({
      year: budgetsTable.year,
      month: budgetsTable.month,
      approved: sql<string>`SUM(${budgetsTable.approvedBudget})`,
      forecast: sql<string>`SUM(${budgetsTable.forecastBudget})`,
    })
    .from(budgetsTable)
    .where(budgetWhere.length ? and(...budgetWhere) : undefined)
    .groupBy(budgetsTable.year, budgetsTable.month);

  const actualRows = await db
    .select({
      year: actualsTable.year,
      month: actualsTable.month,
      actual: sql<string>`SUM(${actualsTable.actualResourceCost} + ${actualsTable.actualVendorCost} + ${actualsTable.actualInvoiceCost})`,
    })
    .from(actualsTable)
    .where(actualWhere.length ? and(...actualWhere) : undefined)
    .groupBy(actualsTable.year, actualsTable.month);

  const map = new Map<string, { year: number; month: number; approved: number; forecast: number; actual: number }>();
  for (const b of budgetRows) {
    const key = `${b.year}-${b.month}`;
    map.set(key, { year: b.year, month: b.month, approved: Number(b.approved), forecast: Number(b.forecast), actual: 0 });
  }
  for (const a of actualRows) {
    const key = `${a.year}-${a.month}`;
    const cur = map.get(key) ?? { year: a.year, month: a.month, approved: 0, forecast: 0, actual: 0 };
    cur.actual = Number(a.actual);
    map.set(key, cur);
  }
  const arr = Array.from(map.values()).sort(
    (x, y) => fyMonthIndex(x.month) - fyMonthIndex(y.month) || x.year - y.year,
  );
  res.json(arr);
});

router.get("/dashboard/utilization", async (req, res) => {
  const fy = parseFy(req);
  const where = fy ? fyWhere(allocationsTable.year, allocationsTable.month, fy) : undefined;
  const rows = await db
    .select({
      resourceId: allocationsTable.resourceId,
      resourceName: resourcesTable.name,
      year: allocationsTable.year,
      month: allocationsTable.month,
      allocationPct: sql<string>`SUM(${allocationsTable.allocationPct})`,
      capacityPct: resourcesTable.availabilityPct,
    })
    .from(allocationsTable)
    .leftJoin(resourcesTable, eq(allocationsTable.resourceId, resourcesTable.id))
    .where(where)
    .groupBy(
      allocationsTable.resourceId,
      resourcesTable.name,
      allocationsTable.year,
      allocationsTable.month,
      resourcesTable.availabilityPct,
    );
  res.json(
    rows.map((r) => ({
      resourceId: r.resourceId,
      resourceName: r.resourceName ?? "",
      year: r.year,
      month: r.month,
      allocationPct: Number(r.allocationPct),
      capacityPct: Number(r.capacityPct ?? 100),
    })),
  );
});

router.get("/dashboard/overallocated", async (_req, res) => {
  const rows = await db
    .select({
      resourceId: allocationsTable.resourceId,
      resourceName: resourcesTable.name,
      year: allocationsTable.year,
      month: allocationsTable.month,
      allocationPct: sql<string>`SUM(${allocationsTable.allocationPct})`,
    })
    .from(allocationsTable)
    .leftJoin(resourcesTable, eq(allocationsTable.resourceId, resourcesTable.id))
    .groupBy(allocationsTable.resourceId, resourcesTable.name, allocationsTable.year, allocationsTable.month);
  const out = rows
    .map((r) => ({
      resourceId: r.resourceId,
      resourceName: r.resourceName ?? "",
      year: r.year,
      month: r.month,
      allocationPct: Number(r.allocationPct),
      overBy: Number(r.allocationPct) - 100,
    }))
    .filter((r) => r.overBy > 0)
    .sort((a, b) => b.overBy - a.overBy);
  res.json(out);
});

router.get("/dashboard/demand-vs-capacity", async (_req, res) => {
  const demandRows = await db
    .select({
      skill: demandsTable.skillRequired,
      total: sql<string>`SUM(${demandsTable.requiredFte})`,
    })
    .from(demandsTable)
    .groupBy(demandsTable.skillRequired);

  const capacityRows = await db
    .select({
      skill: resourcesTable.primarySkill,
      capacity: sql<string>`SUM(${resourcesTable.availabilityPct} / 100.0)`,
    })
    .from(resourcesTable)
    .groupBy(resourcesTable.primarySkill);

  const map = new Map<string, { skill: string; demandFte: number; capacityFte: number }>();
  for (const d of demandRows) map.set(d.skill, { skill: d.skill, demandFte: Number(d.total), capacityFte: 0 });
  for (const c of capacityRows) {
    const cur = map.get(c.skill) ?? { skill: c.skill, demandFte: 0, capacityFte: 0 };
    cur.capacityFte = Number(c.capacity);
    map.set(c.skill, cur);
  }
  const out = Array.from(map.values()).map((r) => ({ ...r, gap: r.demandFte - r.capacityFte }));
  res.json(out);
});

router.get("/dashboard/burn-rate", async (_req, res) => {
  const projects = await db.select().from(projectsTable);
  const actuals = await db
    .select({
      projectId: actualsTable.projectId,
      total: sql<string>`SUM(${actualsTable.actualResourceCost} + ${actualsTable.actualVendorCost} + ${actualsTable.actualInvoiceCost})`,
      months: sql<string>`COUNT(DISTINCT (${actualsTable.year} * 100 + ${actualsTable.month}))`,
    })
    .from(actualsTable)
    .groupBy(actualsTable.projectId);
  const aMap = new Map(actuals.map((a) => [a.projectId, a]));
  const out = projects.map((p) => {
    const a = aMap.get(p.id);
    const actualToDate = a ? Number(a.total) : 0;
    const monthsElapsed = a ? Number(a.months) : 0;
    const approved = Number(p.approvedBudget);
    return {
      projectId: p.id,
      projectName: p.name,
      approvedBudget: approved,
      actualToDate,
      burnPct: approved > 0 ? (actualToDate / approved) * 100 : 0,
      monthsElapsed,
    };
  });
  out.sort((x, y) => y.burnPct - x.burnPct);
  res.json(out);
});

router.get("/dashboard/multi-year", async (_req, res) => {
  // Aggregate by FY ending year
  const budgetRows = await db
    .select({ year: budgetsTable.year, month: budgetsTable.month, approved: budgetsTable.approvedBudget, forecast: budgetsTable.forecastBudget })
    .from(budgetsTable);
  const actualRows = await db
    .select({
      year: actualsTable.year,
      month: actualsTable.month,
      actual: sql<string>`(${actualsTable.actualResourceCost} + ${actualsTable.actualVendorCost} + ${actualsTable.actualInvoiceCost})`,
    })
    .from(actualsTable);

  const map = new Map<number, { year: number; approved: number; forecast: number; actual: number }>();
  for (const b of budgetRows) {
    const fy = fyOf(b.year, b.month);
    const cur = map.get(fy) ?? { year: fy, approved: 0, forecast: 0, actual: 0 };
    cur.approved += Number(b.approved);
    cur.forecast += Number(b.forecast);
    map.set(fy, cur);
  }
  for (const a of actualRows) {
    const fy = fyOf(a.year, a.month);
    const cur = map.get(fy) ?? { year: fy, approved: 0, forecast: 0, actual: 0 };
    cur.actual += Number(a.actual);
    map.set(fy, cur);
  }
  res.json(Array.from(map.values()).sort((x, y) => x.year - y.year));
});

router.get("/dashboard/opex-capex", async (req, res) => {
  const fy = parseFy(req);
  const where = fy ? fyWhere(allocationsTable.year, allocationsTable.month, fy) : undefined;
  const rows = await db
    .select({
      year: allocationsTable.year,
      month: allocationsTable.month,
      planned: sql<string>`${allocationsTable.plannedDays} * ${allocationsTable.rate} * COALESCE(${resourcesTable.fxRateToUsd}, 1)`,
      opexPct: allocationsTable.opexPct,
      capexPct: allocationsTable.capexPct,
    })
    .from(allocationsTable)
    .leftJoin(resourcesTable, eq(allocationsTable.resourceId, resourcesTable.id))
    .where(where);
  const map = new Map<string, { year: number; month: number; opex: number; capex: number }>();
  for (const r of rows) {
    const key = `${r.year}-${r.month}`;
    const cur = map.get(key) ?? { year: r.year, month: r.month, opex: 0, capex: 0 };
    const planned = Number(r.planned);
    cur.opex += (planned * Number(r.opexPct)) / 100;
    cur.capex += (planned * Number(r.capexPct)) / 100;
    map.set(key, cur);
  }
  res.json(
    Array.from(map.values()).sort(
      (a, b) => fyMonthIndex(a.month) - fyMonthIndex(b.month) || a.year - b.year,
    ),
  );
});

router.get("/dashboard/skill-shortage", async (req, res) => {
  const fy = parseFy(req) ?? fyOf(new Date().getFullYear(), new Date().getMonth() + 1);
  const r = fyRange(fy);

  const demands = await db.select().from(demandsTable);
  const resources = await db.select().from(resourcesTable);

  const capacityBySkill = new Map<string, number>();
  for (const res of resources) {
    capacityBySkill.set(res.primarySkill, (capacityBySkill.get(res.primarySkill) ?? 0) + Number(res.availabilityPct) / 100);
  }

  const map = new Map<string, { skill: string; year: number; month: number; demandFte: number }>();
  for (const d of demands) {
    const [sy, sm] = d.startMonth.split("-").map(Number);
    const [ey, em] = d.endMonth.split("-").map(Number);
    if (!sy || !sm || !ey || !em) continue;
    const start = sy * 12 + sm;
    const end = ey * 12 + em;
    for (let t = start; t <= end; t++) {
      const yy = Math.floor((t - 1) / 12);
      const mm = ((t - 1) % 12) + 1;
      const inFy = (yy === r.startYear && mm >= 7) || (yy === r.endYear && mm <= 6);
      if (!inFy) continue;
      const key = `${d.skillRequired}-${yy}-${mm}`;
      const cur = map.get(key) ?? { skill: d.skillRequired, year: yy, month: mm, demandFte: 0 };
      cur.demandFte += Number(d.requiredFte);
      map.set(key, cur);
    }
  }

  const out = Array.from(map.values()).map((row) => {
    const cap = capacityBySkill.get(row.skill) ?? 0;
    return {
      skill: row.skill,
      year: row.year,
      month: row.month,
      demandFte: row.demandFte,
      capacityFte: cap,
      shortageFte: Math.max(0, row.demandFte - cap),
    };
  });
  out.sort(
    (a, b) =>
      fyMonthIndex(a.month) - fyMonthIndex(b.month) ||
      a.year - b.year ||
      b.shortageFte - a.shortageFte,
  );
  res.json(out);
});

export default router;
