import { Router } from "express";
import Papa from "papaparse";
import { db } from "@workspace/db";
import { projectsTable, budgetsTable, actualsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { ImportBudgetsBody, ImportActualsBody } from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: Router = Router();

interface ImportError {
  row: number;
  message: string;
}

router.post(
  "/imports/budgets",
  requireRole("Admin", "Finance Controller", "PMO Lead"),
  async (req, res) => {
    const parsed = ImportBudgetsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const result = Papa.parse<Record<string, string>>(parsed.data.csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });
    let inserted = 0;
    let updated = 0;
    const errors: ImportError[] = [];
    const projects = await db.select().from(projectsTable);
    const codeToId = new Map(projects.map((p) => [p.code.toUpperCase(), p.id]));

    for (let i = 0; i < result.data.length; i++) {
      const r = result.data[i] ?? {};
      const rowNum = i + 2;
      try {
        const code = String(r["project_code"] ?? r["projectcode"] ?? "").trim().toUpperCase();
        const projectId = codeToId.get(code);
        if (!projectId) throw new Error(`Unknown project_code "${code}"`);
        const year = Number(r["year"]);
        const month = Number(r["month"]);
        const costType = String(r["cost_type"] ?? r["costtype"] ?? "Opex").trim();
        if (!Number.isInteger(year) || !Number.isInteger(month)) throw new Error("year/month must be integers");
        if (costType !== "Opex" && costType !== "Capex") throw new Error('cost_type must be "Opex" or "Capex"');
        const approved = Number(r["approved_budget"] ?? r["approvedbudget"] ?? 0);
        const forecast = Number(r["forecast_budget"] ?? r["forecastbudget"] ?? approved);
        const planned = Number(r["planned_resource_cost"] ?? r["plannedresourcecost"] ?? 0);
        const nonRes = Number(r["non_resource_cost"] ?? r["nonresourcecost"] ?? 0);

        const [existing] = await db
          .select()
          .from(budgetsTable)
          .where(
            and(
              eq(budgetsTable.projectId, projectId),
              eq(budgetsTable.year, year),
              eq(budgetsTable.month, month),
              eq(budgetsTable.costType, costType),
            ),
          );

        if (existing) {
          await db
            .update(budgetsTable)
            .set({
              approvedBudget: String(approved),
              forecastBudget: String(forecast),
              plannedResourceCost: String(planned),
              nonResourceCost: String(nonRes),
            })
            .where(eq(budgetsTable.id, existing.id));
          updated++;
        } else {
          await db.insert(budgetsTable).values({
            projectId,
            year,
            month,
            costType,
            approvedBudget: String(approved),
            forecastBudget: String(forecast),
            plannedResourceCost: String(planned),
            nonResourceCost: String(nonRes),
          });
          inserted++;
        }
      } catch (e) {
        errors.push({ row: rowNum, message: e instanceof Error ? e.message : String(e) });
      }
    }
    res.json({ inserted, updated, errors });
  },
);

router.post(
  "/imports/actuals",
  requireRole("Admin", "Finance Controller", "PMO Lead"),
  async (req, res) => {
    const parsed = ImportActualsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const result = Papa.parse<Record<string, string>>(parsed.data.csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });
    let inserted = 0;
    let updated = 0;
    const errors: ImportError[] = [];
    const projects = await db.select().from(projectsTable);
    const codeToId = new Map(projects.map((p) => [p.code.toUpperCase(), p.id]));

    for (let i = 0; i < result.data.length; i++) {
      const r = result.data[i] ?? {};
      const rowNum = i + 2;
      try {
        const code = String(r["project_code"] ?? r["projectcode"] ?? "").trim().toUpperCase();
        const projectId = codeToId.get(code);
        if (!projectId) throw new Error(`Unknown project_code "${code}"`);
        const year = Number(r["year"]);
        const month = Number(r["month"]);
        if (!Number.isInteger(year) || !Number.isInteger(month)) throw new Error("year/month must be integers");
        const resCost = Number(r["actual_resource_cost"] ?? r["actualresourcecost"] ?? 0);
        const venCost = Number(r["actual_vendor_cost"] ?? r["actualvendorcost"] ?? 0);
        const invCost = Number(r["actual_invoice_cost"] ?? r["actualinvoicecost"] ?? 0);
        const source = String(r["source"] ?? "SAP").trim();

        const [existing] = await db
          .select()
          .from(actualsTable)
          .where(
            and(
              eq(actualsTable.projectId, projectId),
              eq(actualsTable.year, year),
              eq(actualsTable.month, month),
            ),
          );

        if (existing) {
          await db
            .update(actualsTable)
            .set({
              actualResourceCost: String(resCost),
              actualVendorCost: String(venCost),
              actualInvoiceCost: String(invCost),
              source,
            })
            .where(eq(actualsTable.id, existing.id));
          updated++;
        } else {
          await db.insert(actualsTable).values({
            projectId,
            year,
            month,
            actualResourceCost: String(resCost),
            actualVendorCost: String(venCost),
            actualInvoiceCost: String(invCost),
            source,
          });
          inserted++;
        }
      } catch (e) {
        errors.push({ row: rowNum, message: e instanceof Error ? e.message : String(e) });
      }
    }
    res.json({ inserted, updated, errors });
  },
);

export default router;
