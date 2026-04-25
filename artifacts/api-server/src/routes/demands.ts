import { Router, type IRouter } from "express";
import { db, demandsTable, projectsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  CreateDemandBody,
  UpdateDemandBody,
  ListDemandsQueryParams,
} from "@workspace/api-zod";
import { requireRole, type AuthedRequest } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

type DemandRow = typeof demandsTable.$inferSelect & { projectName?: string };

function serialize(d: DemandRow) {
  return {
    id: d.id,
    projectId: d.projectId,
    projectName: d.projectName ?? "",
    skillRequired: d.skillRequired,
    roleRequired: d.roleRequired,
    startMonth: d.startMonth,
    endMonth: d.endMonth,
    requiredFte: Number(d.requiredFte),
    priority: d.priority,
    status: d.status,
  };
}

function fnFilter(req: AuthedRequest) {
  const user = req.user;
  if (!user) return undefined;
  if (user.role === "Admin" || user.functionId === null) return undefined;
  return eq(projectsTable.functionId, user.functionId);
}

router.get("/demands", async (req, res) => {
  const authReq = req as AuthedRequest;
  const params = ListDemandsQueryParams.parse(req.query);
  const where = [];
  if (params.projectId) where.push(eq(demandsTable.projectId, params.projectId));
  if (params.status) where.push(eq(demandsTable.status, params.status));
  if (params.skill) where.push(eq(demandsTable.skillRequired, params.skill));
  const ff = fnFilter(authReq);
  if (ff) where.push(ff);
  const rows = await db
    .select({
      id: demandsTable.id,
      projectId: demandsTable.projectId,
      skillRequired: demandsTable.skillRequired,
      roleRequired: demandsTable.roleRequired,
      startMonth: demandsTable.startMonth,
      endMonth: demandsTable.endMonth,
      requiredFte: demandsTable.requiredFte,
      priority: demandsTable.priority,
      status: demandsTable.status,
      projectName: projectsTable.name,
    })
    .from(demandsTable)
    .leftJoin(projectsTable, eq(demandsTable.projectId, projectsTable.id))
    .where(where.length ? and(...where) : undefined);
  res.json(rows.map((r) => serialize(r as DemandRow)));
});

router.post("/demands", requireRole("Admin", "PMO Lead", "Project Manager", "Demand Owner"), async (req, res) => {
  const body = CreateDemandBody.parse(req.body);
  const [row] = await db
    .insert(demandsTable)
    .values({ ...body, requiredFte: String(body.requiredFte) })
    .returning();
  const [proj] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, row!.projectId));
  const serialized = serialize({ ...row!, projectName: proj?.name ?? "" });
  await logAudit(req as AuthedRequest, "CREATE", "demand", row!.id, null, serialized);
  res.status(201).json(serialized);
});

router.patch("/demands/:id", requireRole("Admin", "PMO Lead", "Project Manager", "Demand Owner"), async (req, res) => {
  const id = Number(req.params["id"]);
  const body = UpdateDemandBody.parse(req.body);
  const [old] = await db.select().from(demandsTable).where(eq(demandsTable.id, id));
  const [row] = await db
    .update(demandsTable)
    .set({ ...body, requiredFte: String(body.requiredFte) })
    .where(eq(demandsTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [proj] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, row.projectId));
  const serialized = serialize({ ...row, projectName: proj?.name ?? "" });
  await logAudit(req as AuthedRequest, "UPDATE", "demand", id, old ? serialize(old as DemandRow) : null, serialized);
  res.json(serialized);
});

router.delete("/demands/:id", requireRole("Admin", "PMO Lead", "Project Manager", "Demand Owner"), async (req, res) => {
  const id = Number(req.params["id"]);
  const [old] = await db.select().from(demandsTable).where(eq(demandsTable.id, id));
  await db.delete(demandsTable).where(eq(demandsTable.id, id));
  await logAudit(req as AuthedRequest, "DELETE", "demand", id, old ? serialize(old as DemandRow) : null, null);
  res.status(204).send();
});

export default router;
