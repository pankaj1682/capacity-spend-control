import { Router, type IRouter } from "express";
import { db, resourcesTable, businessFunctionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  CreateResourceBody,
  UpdateResourceBody,
  ListResourcesQueryParams,
} from "@workspace/api-zod";
import { requireRole, type AuthedRequest } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

type ResourceRow = typeof resourcesTable.$inferSelect & { functionName?: string | null };

function serialize(r: ResourceRow) {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    primarySkill: r.primarySkill,
    secondarySkills: r.secondarySkills ?? [],
    location: r.location,
    rate: Number(r.rate),
    rateType: r.rateType,
    currency: r.currency,
    fxRateToUsd: Number(r.fxRateToUsd),
    employmentType: r.employmentType,
    availabilityPct: Number(r.availabilityPct),
    costCentre: r.costCentre,
    functionId: r.functionId ?? null,
    functionName: r.functionName ?? null,
  };
}

function fnFilter(req: AuthedRequest) {
  const user = req.user;
  if (!user) return undefined;
  if (user.role === "Admin" || user.functionId === null) return undefined;
  return eq(resourcesTable.functionId, user.functionId);
}

router.get("/resources", async (req, res) => {
  const authReq = req as AuthedRequest;
  const params = ListResourcesQueryParams.parse(req.query);
  const where = [];
  if (params.location) where.push(eq(resourcesTable.location, params.location));
  if (params.employmentType)
    where.push(eq(resourcesTable.employmentType, params.employmentType));
  if (params.skill) where.push(eq(resourcesTable.primarySkill, params.skill));
  const ff = fnFilter(authReq);
  if (ff) where.push(ff);
  const rows = await db
    .select({
      id: resourcesTable.id,
      name: resourcesTable.name,
      role: resourcesTable.role,
      primarySkill: resourcesTable.primarySkill,
      secondarySkills: resourcesTable.secondarySkills,
      location: resourcesTable.location,
      rate: resourcesTable.rate,
      rateType: resourcesTable.rateType,
      currency: resourcesTable.currency,
      fxRateToUsd: resourcesTable.fxRateToUsd,
      employmentType: resourcesTable.employmentType,
      availabilityPct: resourcesTable.availabilityPct,
      costCentre: resourcesTable.costCentre,
      functionId: resourcesTable.functionId,
      functionName: businessFunctionsTable.name,
    })
    .from(resourcesTable)
    .leftJoin(businessFunctionsTable, eq(resourcesTable.functionId, businessFunctionsTable.id))
    .where(where.length ? and(...where) : undefined);
  res.json(rows.map((r) => serialize(r as ResourceRow)));
});

router.post("/resources", requireRole("Admin", "Resource Manager"), async (req, res) => {
  const body = CreateResourceBody.parse(req.body);
  const [row] = await db
    .insert(resourcesTable)
    .values({
      ...body,
      rate: String(body.rate),
      availabilityPct: String(body.availabilityPct),
      currency: body.currency,
      fxRateToUsd: String(body.fxRateToUsd ?? 1),
      functionId: body.functionId ?? null,
    })
    .returning();
  const [fn] = row!.functionId
    ? await db.select({ name: businessFunctionsTable.name }).from(businessFunctionsTable).where(eq(businessFunctionsTable.id, row!.functionId))
    : [null];
  const serialized = serialize({ ...row!, functionName: fn?.name ?? null });
  await logAudit(req as AuthedRequest, "CREATE", "resource", row!.id, null, serialized);
  res.status(201).json(serialized);
});

router.get("/resources/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const rows = await db
    .select({
      id: resourcesTable.id,
      name: resourcesTable.name,
      role: resourcesTable.role,
      primarySkill: resourcesTable.primarySkill,
      secondarySkills: resourcesTable.secondarySkills,
      location: resourcesTable.location,
      rate: resourcesTable.rate,
      rateType: resourcesTable.rateType,
      currency: resourcesTable.currency,
      fxRateToUsd: resourcesTable.fxRateToUsd,
      employmentType: resourcesTable.employmentType,
      availabilityPct: resourcesTable.availabilityPct,
      costCentre: resourcesTable.costCentre,
      functionId: resourcesTable.functionId,
      functionName: businessFunctionsTable.name,
    })
    .from(resourcesTable)
    .leftJoin(businessFunctionsTable, eq(resourcesTable.functionId, businessFunctionsTable.id))
    .where(eq(resourcesTable.id, id));
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(serialize(rows[0] as ResourceRow));
});

router.patch("/resources/:id", requireRole("Admin", "Resource Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const body = UpdateResourceBody.parse(req.body);
  const [old] = await db.select().from(resourcesTable).where(eq(resourcesTable.id, id));
  const [row] = await db
    .update(resourcesTable)
    .set({
      ...body,
      rate: String(body.rate),
      availabilityPct: String(body.availabilityPct),
      currency: body.currency,
      fxRateToUsd: String(body.fxRateToUsd ?? 1),
      functionId: body.functionId ?? null,
    })
    .where(eq(resourcesTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [fn] = row.functionId
    ? await db.select({ name: businessFunctionsTable.name }).from(businessFunctionsTable).where(eq(businessFunctionsTable.id, row.functionId))
    : [null];
  const serialized = serialize({ ...row, functionName: fn?.name ?? null });
  await logAudit(req as AuthedRequest, "UPDATE", "resource", id, old ? serialize({ ...old, functionName: null }) : null, serialized);
  res.json(serialized);
});

router.delete("/resources/:id", requireRole("Admin", "Resource Manager"), async (req, res) => {
  const id = Number(req.params["id"]);
  const [old] = await db.select().from(resourcesTable).where(eq(resourcesTable.id, id));
  await db.delete(resourcesTable).where(eq(resourcesTable.id, id));
  await logAudit(req as AuthedRequest, "DELETE", "resource", id, old ? serialize({ ...old, functionName: null }) : null, null);
  res.status(204).send();
});

export default router;
