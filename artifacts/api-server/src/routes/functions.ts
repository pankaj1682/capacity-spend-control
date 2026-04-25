import { Router, type IRouter } from "express";
import { db, businessFunctionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/functions", async (_req, res) => {
  const rows = await db.select().from(businessFunctionsTable).orderBy(businessFunctionsTable.id);
  res.json(rows);
});

router.post("/functions", requireRole("Admin"), async (req, res) => {
  const { name, slug } = req.body as { name: string; slug: string };
  if (!name || !slug) return res.status(400).json({ error: "name and slug required" });
  const [row] = await db.insert(businessFunctionsTable).values({ name, slug }).returning();
  res.status(201).json(row);
});

router.patch("/functions/:id", requireRole("Admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  const { name, slug } = req.body as { name?: string; slug?: string };
  const updates: Record<string, string> = {};
  if (name) updates["name"] = name;
  if (slug) updates["slug"] = slug;
  if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to update" });
  const [row] = await db.update(businessFunctionsTable).set(updates).where(eq(businessFunctionsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.delete("/functions/:id", requireRole("Admin"), async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(businessFunctionsTable).where(eq(businessFunctionsTable.id, id));
  res.status(204).send();
});

export default router;
