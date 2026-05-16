import { pgTable, text, serial, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const issuesTable = pgTable("issues", {
  id: serial("id").primaryKey(),
  productCode: text("product_code").notNull(),
  location: text("location").notNull(),
  reportedQty: integer("reported_qty").notNull(),
  systemQty: integer("system_qty").notNull(),
  diff: integer("diff").notNull(),
  valueAtRisk: doublePrecision("value_at_risk").notNull(),
  severity: text("severity").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIssueSchema = createInsertSchema(issuesTable).omit({ id: true, createdAt: true });
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issuesTable.$inferSelect;
