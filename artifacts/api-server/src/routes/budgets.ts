import { Router, type IRouter } from "express";
import { db, budgetsTable, projectsTable } from "@workspace/db";
import { and, eq, gte, lte, or } from "drizzle-orm";
import {
  CreateBudgetBody,
  UpdateBudgetBody,
  ListBudgetsQueryParams,
} from "@workspace/api-zod";
import { requireRole, type AuthedRequest } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { fyRange } from "../lib/fy";

const router: IRouter = Router();

type BudgetRow = typeof budgetsTable.$inferSelect & { projectName?: string };

function serialize(b: BudgetRow) {
  return {
    id: b.id,
    projectId: b.projectId,
    projectName: b.projectName ?? "",
    year: b.year,
    month: b.month,
    costType: b.costType,
    approvedBudget: Number(b.approvedBudget),
    forecastBudget: Number(b.forecastBudget),
    plannedResourceCost: Number(b.plannedResourceCost),
    nonResourceCost: Number(b.nonResourceCost),
  };
}

function fnFilter(req: AuthedRequest) {
  const user = req.user;
  if (!user) return undefined;
  if (user.role === "Admin" || user.functionId === null) return undefined;
  return eq(projectsTable.functionId, user.functionId);
}

router.get("/budgets", async (req, res) => {
  const authReq = req as AuthedRequest;
  const params = ListBudgetsQueryParams.parse(req.query);
  const where = [];
  if (params.projectId) where.push(eq(budgetsTable.projectId, params.projectId));
  if (params.year) where.push(eq(budgetsTable.year, params.year));
  if ((params as { fy?: number }).fy) {
    const r = fyRange(Number((params as { fy?: number }).fy));
    where.push(or(
      and(eq(budgetsTable.year, r.startYear), gte(budgetsTable.month, r.startMonth)),
      and(eq(budgetsTable.year, r.endYear), lte(budgetsTable.month, r.endMonth)),
    )!);
  }
  const ff = fnFilter(authReq);
  if (ff) where.push(ff);
  const rows = await db
    .select({
      id: budgetsTable.id,
      projectId: budgetsTable.projectId,
      year: budgetsTable.year,
      month: budgetsTable.month,
      costType: budgetsTable.costType,
      approvedBudget: budgetsTable.approvedBudget,
      forecastBudget: budgetsTable.forecastBudget,
      plannedResourceCost: budgetsTable.plannedResourceCost,
      nonResourceCost: budgetsTable.nonResourceCost,
      projectName: projectsTable.name,
    })
    .from(budgetsTable)
    .leftJoin(projectsTable, eq(budgetsTable.projectId, projectsTable.id))
    .where(where.length ? and(...where) : undefined);
  res.json(rows.map((r) => serialize(r as BudgetRow)));
});

router.post("/budgets", requireRole("Admin", "Finance Controller", "PMO Lead", "Project Manager"), async (req, res) => {
  const body = CreateBudgetBody.parse(req.body);
  const [row] = await db
    .insert(budgetsTable)
    .values({
      ...body,
      approvedBudget: String(body.approvedBudget),
      forecastBudget: String(body.forecastBudget),
      plannedResourceCost: String(body.plannedResourceCost),
      nonResourceCost: String(body.nonResourceCost),
    })
    .returning();
  const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, row!.projectId));
  const serialized = serialize({ ...row!, projectName: proj?.name ?? "" });
  await logAudit(req as AuthedRequest, "CREATE", "budget", row!.id, null, serialized);
  res.status(201).json(serialized);
});

router.patch("/budgets/:id", requireRole("Admin", "Finance Controller", "PMO Lead", "Project Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const body = UpdateBudgetBody.parse(req.body);
  const [old] = await db.select().from(budgetsTable).where(eq(budgetsTable.id, id));
  const [row] = await db
    .update(budgetsTable)
    .set({
      ...body,
      approvedBudget: String(body.approvedBudget),
      forecastBudget: String(body.forecastBudget),
      plannedResourceCost: String(body.plannedResourceCost),
      nonResourceCost: String(body.nonResourceCost),
    })
    .where(eq(budgetsTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, row.projectId));
  const serialized = serialize({ ...row, projectName: proj?.name ?? "" });
  await logAudit(req as AuthedRequest, "UPDATE", "budget", id, old ? serialize(old as BudgetRow) : null, serialized);
  res.json(serialized);
});

router.delete("/budgets/:id", requireRole("Admin", "Finance Controller", "PMO Lead", "Project Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const [old] = await db.select().from(budgetsTable).where(eq(budgetsTable.id, id));
  await db.delete(budgetsTable).where(eq(budgetsTable.id, id));
  await logAudit(req as AuthedRequest, "DELETE", "budget", id, old ? serialize(old as BudgetRow) : null, null);
  res.status(204).send();
});

export default router;
