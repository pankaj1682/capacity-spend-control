import { Router, type IRouter } from "express";
import { db, projectsTable, businessFunctionsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  ListProjectsQueryParams,
} from "@workspace/api-zod";
import { requireRole, type AuthedRequest } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

type ProjectRow = typeof projectsTable.$inferSelect & { functionName?: string | null };

function serialize(p: ProjectRow) {
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    portfolio: p.portfolio,
    startDate: p.startDate,
    endDate: p.endDate,
    phase: p.phase,
    budgetOwner: p.budgetOwner,
    status: p.status,
    approvedBudget: Number(p.approvedBudget),
    functionId: p.functionId ?? null,
    functionName: p.functionName ?? null,
  };
}

function fnFilter(req: AuthedRequest) {
  const user = req.user;
  if (!user) return undefined;
  if (user.role === "Admin" || user.functionId === null) return undefined;
  return eq(projectsTable.functionId, user.functionId);
}

router.get("/projects", async (req, res) => {
  const authReq = req as AuthedRequest;
  const params = ListProjectsQueryParams.parse(req.query);
  const where = [];
  if (params.status) where.push(eq(projectsTable.status, params.status));
  if (params.portfolio) where.push(eq(projectsTable.portfolio, params.portfolio));
  if (params.phase) where.push(eq(projectsTable.phase, params.phase));
  const ff = fnFilter(authReq);
  if (ff) where.push(ff);
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      code: projectsTable.code,
      portfolio: projectsTable.portfolio,
      startDate: projectsTable.startDate,
      endDate: projectsTable.endDate,
      phase: projectsTable.phase,
      budgetOwner: projectsTable.budgetOwner,
      status: projectsTable.status,
      approvedBudget: projectsTable.approvedBudget,
      functionId: projectsTable.functionId,
      functionName: businessFunctionsTable.name,
    })
    .from(projectsTable)
    .leftJoin(businessFunctionsTable, eq(projectsTable.functionId, businessFunctionsTable.id))
    .where(where.length ? and(...where) : undefined);
  res.json(rows.map((r) => serialize(r as ProjectRow)));
});

router.post("/projects", requireRole("Admin", "PMO Lead", "Project Manager"), async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const [row] = await db
    .insert(projectsTable)
    .values({
      ...body,
      approvedBudget: String(body.approvedBudget),
      functionId: body.functionId ?? null,
    })
    .returning();
  const [fn] = row!.functionId
    ? await db.select({ name: businessFunctionsTable.name }).from(businessFunctionsTable).where(eq(businessFunctionsTable.id, row!.functionId))
    : [null];
  const serialized = serialize({ ...row!, functionName: fn?.name ?? null });
  await logAudit(req as AuthedRequest, "CREATE", "project", row!.id, null, serialized);
  res.status(201).json(serialized);
});

router.get("/projects/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      code: projectsTable.code,
      portfolio: projectsTable.portfolio,
      startDate: projectsTable.startDate,
      endDate: projectsTable.endDate,
      phase: projectsTable.phase,
      budgetOwner: projectsTable.budgetOwner,
      status: projectsTable.status,
      approvedBudget: projectsTable.approvedBudget,
      functionId: projectsTable.functionId,
      functionName: businessFunctionsTable.name,
    })
    .from(projectsTable)
    .leftJoin(businessFunctionsTable, eq(projectsTable.functionId, businessFunctionsTable.id))
    .where(eq(projectsTable.id, id));
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(serialize(rows[0] as ProjectRow));
});

router.patch("/projects/:id", requireRole("Admin", "PMO Lead", "Project Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const body = UpdateProjectBody.parse(req.body);
  const [old] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  const [row] = await db
    .update(projectsTable)
    .set({
      ...body,
      approvedBudget: String(body.approvedBudget),
      functionId: body.functionId ?? null,
    })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [fn] = row.functionId
    ? await db.select({ name: businessFunctionsTable.name }).from(businessFunctionsTable).where(eq(businessFunctionsTable.id, row.functionId))
    : [null];
  const serialized = serialize({ ...row, functionName: fn?.name ?? null });
  await logAudit(req as AuthedRequest, "UPDATE", "project", id, old ? serialize({ ...old, functionName: null }) : null, serialized);
  res.json(serialized);
});

router.delete("/projects/:id", requireRole("Admin", "PMO Lead", "Project Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const [old] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  await logAudit(req as AuthedRequest, "DELETE", "project", id, old ? serialize({ ...old, functionName: null }) : null, null);
  res.status(204).send();
});

export default router;
