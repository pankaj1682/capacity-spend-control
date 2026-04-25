import { Router, type IRouter } from "express";
import { db, actualsTable, projectsTable } from "@workspace/db";
import { and, eq, gte, lte, or } from "drizzle-orm";
import {
  CreateActualBody,
  UpdateActualBody,
  ListActualsQueryParams,
} from "@workspace/api-zod";
import { requireRole, type AuthedRequest } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { fyRange } from "../lib/fy";

const router: IRouter = Router();

type ActualRow = typeof actualsTable.$inferSelect & { projectName?: string };

function serialize(a: ActualRow) {
  return {
    id: a.id,
    projectId: a.projectId,
    projectName: a.projectName ?? "",
    year: a.year,
    month: a.month,
    actualResourceCost: Number(a.actualResourceCost),
    actualVendorCost: Number(a.actualVendorCost),
    actualInvoiceCost: Number(a.actualInvoiceCost),
    source: a.source,
  };
}

function fnFilter(req: AuthedRequest) {
  const user = req.user;
  if (!user) return undefined;
  if (user.role === "Admin" || user.functionId === null) return undefined;
  return eq(projectsTable.functionId, user.functionId);
}

router.get("/actuals", async (req, res) => {
  const authReq = req as AuthedRequest;
  const params = ListActualsQueryParams.parse(req.query);
  const where = [];
  if (params.projectId) where.push(eq(actualsTable.projectId, params.projectId));
  if (params.year) where.push(eq(actualsTable.year, params.year));
  if ((params as { fy?: number }).fy) {
    const r = fyRange(Number((params as { fy?: number }).fy));
    where.push(or(
      and(eq(actualsTable.year, r.startYear), gte(actualsTable.month, r.startMonth)),
      and(eq(actualsTable.year, r.endYear), lte(actualsTable.month, r.endMonth)),
    )!);
  }
  if (params.source) where.push(eq(actualsTable.source, params.source));
  const ff = fnFilter(authReq);
  if (ff) where.push(ff);
  const rows = await db
    .select({
      id: actualsTable.id,
      projectId: actualsTable.projectId,
      year: actualsTable.year,
      month: actualsTable.month,
      actualResourceCost: actualsTable.actualResourceCost,
      actualVendorCost: actualsTable.actualVendorCost,
      actualInvoiceCost: actualsTable.actualInvoiceCost,
      source: actualsTable.source,
      projectName: projectsTable.name,
    })
    .from(actualsTable)
    .leftJoin(projectsTable, eq(actualsTable.projectId, projectsTable.id))
    .where(where.length ? and(...where) : undefined);
  res.json(rows.map((r) => serialize(r as ActualRow)));
});

router.post("/actuals", requireRole("Admin", "Finance Controller", "PMO Lead", "Project Manager"), async (req, res) => {
  const body = CreateActualBody.parse(req.body);
  const [row] = await db
    .insert(actualsTable)
    .values({
      ...body,
      actualResourceCost: String(body.actualResourceCost),
      actualVendorCost: String(body.actualVendorCost),
      actualInvoiceCost: String(body.actualInvoiceCost),
    })
    .returning();
  const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, row!.projectId));
  const serialized = serialize({ ...row!, projectName: proj?.name ?? "" });
  await logAudit(req as AuthedRequest, "CREATE", "actual", row!.id, null, serialized);
  res.status(201).json(serialized);
});

router.patch("/actuals/:id", requireRole("Admin", "Finance Controller", "PMO Lead", "Project Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const body = UpdateActualBody.parse(req.body);
  const [old] = await db.select().from(actualsTable).where(eq(actualsTable.id, id));
  const [row] = await db
    .update(actualsTable)
    .set({
      ...body,
      actualResourceCost: String(body.actualResourceCost),
      actualVendorCost: String(body.actualVendorCost),
      actualInvoiceCost: String(body.actualInvoiceCost),
    })
    .where(eq(actualsTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, row.projectId));
  const serialized = serialize({ ...row, projectName: proj?.name ?? "" });
  await logAudit(req as AuthedRequest, "UPDATE", "actual", id, old ? serialize(old as ActualRow) : null, serialized);
  res.json(serialized);
});

router.delete("/actuals/:id", requireRole("Admin", "Finance Controller", "PMO Lead", "Project Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const [old] = await db.select().from(actualsTable).where(eq(actualsTable.id, id));
  await db.delete(actualsTable).where(eq(actualsTable.id, id));
  await logAudit(req as AuthedRequest, "DELETE", "actual", id, old ? serialize(old as ActualRow) : null, null);
  res.status(204).send();
});

export default router;
