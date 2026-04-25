import { pgTable, serial, integer, numeric, text } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { resourcesTable } from "./resources";

export const allocationsTable = pgTable("allocations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id").notNull().references(() => resourcesTable.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  plannedDays: numeric("planned_days", { precision: 6, scale: 2 }).notNull(),
  allocationPct: numeric("allocation_pct", { precision: 5, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
  opexPct: numeric("opex_pct", { precision: 5, scale: 2 }).notNull(),
  capexPct: numeric("capex_pct", { precision: 5, scale: 2 }).notNull(),
  wbsCode: text("wbs_code").notNull(),
});

export type Allocation = typeof allocationsTable.$inferSelect;
export type InsertAllocation = typeof allocationsTable.$inferInsert;
