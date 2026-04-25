import { pgTable, serial, integer, text, numeric } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const budgetsTable = pgTable("budgets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  costType: text("cost_type").notNull(),
  approvedBudget: numeric("approved_budget", { precision: 14, scale: 2 }).notNull(),
  forecastBudget: numeric("forecast_budget", { precision: 14, scale: 2 }).notNull(),
  plannedResourceCost: numeric("planned_resource_cost", { precision: 14, scale: 2 }).notNull(),
  nonResourceCost: numeric("non_resource_cost", { precision: 14, scale: 2 }).notNull(),
});

export type BudgetPlan = typeof budgetsTable.$inferSelect;
export type InsertBudgetPlan = typeof budgetsTable.$inferInsert;
