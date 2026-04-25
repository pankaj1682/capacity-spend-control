import { pgTable, serial, integer, numeric, text } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const actualsTable = pgTable("actuals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  actualResourceCost: numeric("actual_resource_cost", { precision: 14, scale: 2 }).notNull(),
  actualVendorCost: numeric("actual_vendor_cost", { precision: 14, scale: 2 }).notNull(),
  actualInvoiceCost: numeric("actual_invoice_cost", { precision: 14, scale: 2 }).notNull(),
  source: text("source").notNull(),
});

export type Actual = typeof actualsTable.$inferSelect;
export type InsertActual = typeof actualsTable.$inferInsert;
