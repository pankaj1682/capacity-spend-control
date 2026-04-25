import { Router } from "express";
import { db } from "@workspace/db";
import { fxRatesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { UpsertFxRateBody } from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: Router = Router();

router.get("/fx-rates", async (_req, res) => {
  const rows = await db.select().from(fxRatesTable).orderBy(fxRatesTable.currency);
  res.json(rows.map((r) => ({ currency: r.currency, rateToUsd: Number(r.rateToUsd), updatedAt: r.updatedAt })));
});

router.post("/fx-rates", requireRole("Admin", "Finance Controller"), async (req, res) => {
  const parsed = UpsertFxRateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid FX rate" });
    return;
  }
  const { currency, rateToUsd } = parsed.data;
  const cur = currency.toUpperCase();
  const [r] = await db
    .insert(fxRatesTable)
    .values({ currency: cur, rateToUsd: String(rateToUsd) })
    .onConflictDoUpdate({
      target: fxRatesTable.currency,
      set: { rateToUsd: String(rateToUsd), updatedAt: sql`now()` },
    })
    .returning();
  if (!r) {
    res.status(500).json({ error: "Could not save FX rate" });
    return;
  }
  res.json({ currency: r.currency, rateToUsd: Number(r.rateToUsd), updatedAt: r.updatedAt });
});

router.delete("/fx-rates/:currency", requireRole("Admin", "Finance Controller"), async (req, res) => {
  const cur = String(req.params["currency"]).toUpperCase();
  await db.delete(fxRatesTable).where(eq(fxRatesTable.currency, cur));
  res.status(204).end();
});

export default router;
