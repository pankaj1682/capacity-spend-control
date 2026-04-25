import { pgTable, serial, text, numeric, json, integer } from "drizzle-orm/pg-core";
import { businessFunctionsTable } from "./businessFunctions";

export const resourcesTable = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  primarySkill: text("primary_skill").notNull(),
  secondarySkills: json("secondary_skills").$type<string[]>().notNull().default([]),
  location: text("location").notNull(),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
  rateType: text("rate_type").notNull(),
  currency: text("currency").notNull().default("USD"),
  fxRateToUsd: numeric("fx_rate_to_usd", { precision: 18, scale: 8 }).notNull().default("1"),
  employmentType: text("employment_type").notNull(),
  availabilityPct: numeric("availability_pct", { precision: 5, scale: 2 }).notNull(),
  costCentre: text("cost_centre").notNull(),
  functionId: integer("function_id").references(() => businessFunctionsTable.id),
});

export type Resource = typeof resourcesTable.$inferSelect;
export type InsertResource = typeof resourcesTable.$inferInsert;
