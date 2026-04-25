import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, businessFunctionsTable, type Role } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";
import { hashPassword, requireRole } from "../lib/auth";

const router: Router = Router();

function serializeUser(u: typeof usersTable.$inferSelect, functionName?: string | null) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    functionId: u.functionId ?? null,
    functionName: functionName ?? null,
  };
}

router.get("/users", requireRole("Admin"), async (_req, res) => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      passwordHash: usersTable.passwordHash,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
      functionId: usersTable.functionId,
      functionName: businessFunctionsTable.name,
    })
    .from(usersTable)
    .leftJoin(businessFunctionsTable, eq(usersTable.functionId, businessFunctionsTable.id))
    .orderBy(usersTable.id);
  res.json(
    rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      functionId: u.functionId ?? null,
      functionName: u.functionName ?? null,
    })),
  );
});

router.post("/users", requireRole("Admin"), async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user data" });
    return;
  }
  const { email, password, name, role, functionId } = parsed.data;
  const lower = email.toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, lower));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [u] = await db
    .insert(usersTable)
    .values({ email: lower, passwordHash, name, role: role as Role, functionId: functionId ?? null })
    .returning();
  if (!u) {
    res.status(500).json({ error: "Could not create user" });
    return;
  }
  const [fn] = u.functionId
    ? await db.select({ name: businessFunctionsTable.name }).from(businessFunctionsTable).where(eq(businessFunctionsTable.id, u.functionId))
    : [null];
  res.status(201).json(serializeUser(u, fn?.name));
});

router.patch("/users/:id", requireRole("Admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update data" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates["name"] = parsed.data.name;
  if (parsed.data.role !== undefined) updates["role"] = parsed.data.role;
  if (parsed.data.password !== undefined) updates["passwordHash"] = await hashPassword(parsed.data.password);
  if ("functionId" in parsed.data) updates["functionId"] = parsed.data.functionId ?? null;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [u] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!u) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [fn] = u.functionId
    ? await db.select({ name: businessFunctionsTable.name }).from(businessFunctionsTable).where(eq(businessFunctionsTable.id, u.functionId))
    : [null];
  res.json(serializeUser(u, fn?.name));
});

router.delete("/users/:id", requireRole("Admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).end();
});

export default router;
