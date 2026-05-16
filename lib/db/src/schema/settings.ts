import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("My Building Supplies"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  accentColor: text("accent_color").notNull().default("#0f172a"),
  loginGlowColor: text("login_glow_color").notNull().default("#7c3aed"),
  contentBarColor: text("content_bar_color").notNull().default("#0f172a"),
  smsCredit: boolean("sms_credit").notNull().default(true),
  smsLowStock: boolean("sms_low_stock").notNull().default(true),
  smsDaily: boolean("sms_daily").notNull().default(false),
  smsSenderId: text("sms_sender_id").notNull().default("BRANCHCTRL"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
