import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { businessFunctionsTable } from "./businessFunctions";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  functionId: integer("function_id").references(() => businessFunctionsTable.id),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const ROLES = [
  "Admin",
  "PMO Lead",
  "Project Manager",
  "Finance Controller",
  "Resource Manager",
  "Demand Owner",
  "Viewer",
] as const;
export type Role = (typeof ROLES)[number];
