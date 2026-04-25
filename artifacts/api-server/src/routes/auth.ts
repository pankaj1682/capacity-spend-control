import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, businessFunctionsTable, type Role } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, type AuthedRequest } from "../lib/auth";

const router: Router = Router();

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid signup data" });
    return;
  }
  const { email, password, name } = parsed.data;
  const lower = email.toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, lower));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [{ value: existingCount }] = await db.select({ value: count() }).from(usersTable);
  const role: Role = existingCount === 0 ? "Admin" : "Viewer";
  const passwordHash = await hashPassword(password);
  const [u] = await db
    .insert(usersTable)
    .values({ email: lower, passwordHash, name, role })
    .returning();
  if (!u) {
    res.status(500).json({ error: "Could not create user" });
    return;
  }
  (req as AuthedRequest).session.userId = u.id;
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Could not save session" });
      return;
    }
    res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt, functionId: null, functionName: null } });
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login data" });
    return;
  }
  const lower = parsed.data.email.toLowerCase();
  const [u] = await db.select().from(usersTable).where(eq(usersTable.email, lower));
  if (!u || !(await verifyPassword(parsed.data.password, u.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  (req as AuthedRequest).session.userId = u.id;
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Could not save session" });
      return;
    }
    res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt, functionId: u.functionId ?? null, functionName: null } });
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("csc.sid");
    res.status(204).end();
  });
});

router.get("/auth/me", async (req, res) => {
  const u = (req as AuthedRequest).user;
  if (!u) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  let functionName: string | null = null;
  if (u.functionId) {
    const [fn] = await db.select({ name: businessFunctionsTable.name }).from(businessFunctionsTable).where(eq(businessFunctionsTable.id, u.functionId));
    functionName = fn?.name ?? null;
  }
  res.json({ user: { ...u, createdAt: new Date().toISOString(), functionName } });
});

export default router;
