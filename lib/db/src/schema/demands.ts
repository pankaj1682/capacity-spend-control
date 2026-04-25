import { pgTable, serial, text, integer, numeric } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const demandsTable = pgTable("demands", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  skillRequired: text("skill_required").notNull(),
  roleRequired: text("role_required").notNull(),
  startMonth: text("start_month").notNull(),
  endMonth: text("end_month").notNull(),
  requiredFte: numeric("required_fte", { precision: 6, scale: 2 }).notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
});

export type Demand = typeof demandsTable.$inferSelect;
export type InsertDemand = typeof demandsTable.$inferInsert;
