import { pgTable, serial, text, date, numeric, integer } from "drizzle-orm/pg-core";
import { businessFunctionsTable } from "./businessFunctions";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  portfolio: text("portfolio").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  phase: text("phase").notNull(),
  budgetOwner: text("budget_owner").notNull(),
  status: text("status").notNull(),
  approvedBudget: numeric("approved_budget", { precision: 14, scale: 2 }).notNull(),
  functionId: integer("function_id").references(() => businessFunctionsTable.id),
});

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
