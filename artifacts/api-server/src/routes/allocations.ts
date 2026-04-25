import { Router, type IRouter } from "express";
import { db, allocationsTable, projectsTable, resourcesTable } from "@workspace/db";
import { and, eq, gte, lte, or } from "drizzle-orm";
import {
  CreateAllocationBody,
  UpdateAllocationBody,
  ListAllocationsQueryParams,
} from "@workspace/api-zod";
import { requireRole, type AuthedRequest } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { fyRange } from "../lib/fy";

const router: IRouter = Router();

type AllocRow = typeof allocationsTable.$inferSelect & {
  projectName?: string;
  resourceName?: string;
  fxRateToUsd?: string | number | null;
};

function serialize(a: AllocRow) {
  const fx = Number(a.fxRateToUsd ?? 1) || 1;
  const planned = Number(a.plannedDays) * Number(a.rate) * fx;
  return {
    id: a.id,
    projectId: a.projectId,
    projectName: a.projectName ?? "",
    resourceId: a.resourceId,
    resourceName: a.resourceName ?? "",
    month: a.month,
    year: a.year,
    plannedDays: Number(a.plannedDays),
    allocationPct: Number(a.allocationPct),
    rate: Number(a.rate),
    plannedCost: planned,
    opexPct: Number(a.opexPct),
    capexPct: Number(a.capexPct),
    wbsCode: a.wbsCode,
  };
}

function fnFilter(req: AuthedRequest) {
  const user = req.user;
  if (!user) return undefined;
  if (user.role === "Admin" || user.functionId === null) return undefined;
  return eq(projectsTable.functionId, user.functionId);
}

router.get("/allocations", async (req, res) => {
  const authReq = req as AuthedRequest;
  const params = ListAllocationsQueryParams.parse(req.query);
  const where = [];
  if (params.projectId) where.push(eq(allocationsTable.projectId, params.projectId));
  if (params.resourceId) where.push(eq(allocationsTable.resourceId, params.resourceId));
  if (params.year) where.push(eq(allocationsTable.year, params.year));
  if ((params as { fy?: number }).fy) {
    const r = fyRange(Number((params as { fy?: number }).fy));
    where.push(or(
      and(eq(allocationsTable.year, r.startYear), gte(allocationsTable.month, r.startMonth)),
      and(eq(allocationsTable.year, r.endYear), lte(allocationsTable.month, r.endMonth)),
    )!);
  }
  if (params.month) where.push(eq(allocationsTable.month, params.month));
  const ff = fnFilter(authReq);
  if (ff) where.push(ff);
  const rows = await db
    .select({
      id: allocationsTable.id,
      projectId: allocationsTable.projectId,
      resourceId: allocationsTable.resourceId,
      month: allocationsTable.month,
      year: allocationsTable.year,
      plannedDays: allocationsTable.plannedDays,
      allocationPct: allocationsTable.allocationPct,
      rate: allocationsTable.rate,
      opexPct: allocationsTable.opexPct,
      capexPct: allocationsTable.capexPct,
      wbsCode: allocationsTable.wbsCode,
      projectName: projectsTable.name,
      resourceName: resourcesTable.name,
      fxRateToUsd: resourcesTable.fxRateToUsd,
    })
    .from(allocationsTable)
    .leftJoin(projectsTable, eq(allocationsTable.projectId, projectsTable.id))
    .leftJoin(resourcesTable, eq(allocationsTable.resourceId, resourcesTable.id))
    .where(where.length ? and(...where) : undefined);
  res.json(rows.map((r) => serialize(r as AllocRow)));
});

router.post("/allocations", requireRole("Admin", "Resource Manager", "PMO Lead"), async (req, res) => {
  const body = CreateAllocationBody.parse(req.body);
  const [row] = await db
    .insert(allocationsTable)
    .values({
      ...body,
      plannedDays: String(body.plannedDays),
      allocationPct: String(body.allocationPct),
      rate: String(body.rate),
      opexPct: String(body.opexPct),
      capexPct: String(body.capexPct),
    })
    .returning();
  const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, row!.projectId));
  const [resrc] = await db.select({ name: resourcesTable.name, fxRateToUsd: resourcesTable.fxRateToUsd }).from(resourcesTable).where(eq(resourcesTable.id, row!.resourceId));
  const serialized = serialize({ ...row!, projectName: proj?.name ?? "", resourceName: resrc?.name ?? "", fxRateToUsd: resrc?.fxRateToUsd });
  await logAudit(req as AuthedRequest, "CREATE", "allocation", row!.id, null, serialized);
  res.status(201).json(serialized);
});

router.patch("/allocations/:id", requireRole("Admin", "Resource Manager", "PMO Lead"), async (req, res) => {
  const id = Number(req.params["id"]);
  const body = UpdateAllocationBody.parse(req.body);
  const [old] = await db.select().from(allocationsTable).where(eq(allocationsTable.id, id));
  const [row] = await db
    .update(allocationsTable)
    .set({
      ...body,
      plannedDays: String(body.plannedDays),
      allocationPct: String(body.allocationPct),
      rate: String(body.rate),
      opexPct: String(body.opexPct),
      capexPct: String(body.capexPct),
    })
    .where(eq(allocationsTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, row.projectId));
  const [resrc] = await db.select({ name: resourcesTable.name, fxRateToUsd: resourcesTable.fxRateToUsd }).from(resourcesTable).where(eq(resourcesTable.id, row.resourceId));
  const serialized = serialize({ ...row, projectName: proj?.name ?? "", resourceName: resrc?.name ?? "", fxRateToUsd: resrc?.fxRateToUsd });
  await logAudit(req as AuthedRequest, "UPDATE", "allocation", id, old ? serialize(old as AllocRow) : null, serialized);
  res.json(serialized);
});

router.delete("/allocations/:id", requireRole("Admin", "Resource Manager", "PMO Lead"), async (req, res) => {
  const id = Number(req.params["id"]);
  const [old] = await db.select().from(allocationsTable).where(eq(allocationsTable.id, id));
  await db.delete(allocationsTable).where(eq(allocationsTable.id, id));
  await logAudit(req as AuthedRequest, "DELETE", "allocation", id, old ? serialize(old as AllocRow) : null, null);
  res.status(204).send();
});

export default router;
