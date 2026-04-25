import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const businessFunctionsTable = pgTable("business_functions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export type BusinessFunction = typeof businessFunctionsTable.$inferSelect;
export type InsertBusinessFunction = typeof businessFunctionsTable.$inferInsert;
