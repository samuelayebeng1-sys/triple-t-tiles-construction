import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  branch: text("branch").notNull(),
  totalCash: doublePrecision("total_cash").notNull().default(0),
  totalMomo: doublePrecision("total_momo").notNull().default(0),
  totalCredit: doublePrecision("total_credit").notNull().default(0),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  totalProfit: doublePrecision("total_profit").notNull().default(0),
  itemsSold: integer("items_sold").notNull().default(0),
  status: text("status").notNull().default("LOCKED"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEntrySchema = createInsertSchema(entriesTable).omit({ id: true, createdAt: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entriesTable.$inferSelect;
