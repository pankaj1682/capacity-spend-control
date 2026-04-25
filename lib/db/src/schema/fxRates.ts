import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const fxRatesTable = pgTable("fx_rates", {
  currency: text("currency").primaryKey(),
  rateToUsd: numeric("rate_to_usd", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FxRate = typeof fxRatesTable.$inferSelect;
export type InsertFxRate = typeof fxRatesTable.$inferInsert;
