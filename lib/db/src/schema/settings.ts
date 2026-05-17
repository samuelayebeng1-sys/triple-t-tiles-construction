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
  sidebarColor: text("sidebar_color").notNull().default("#0f172a"),
  loginPanelBg: text("login_panel_bg").notNull().default("#0a0f1e"),
  loginRightBg: text("login_right_bg").notNull().default("#f8fafc"),
  contentBg: text("content_bg").notNull().default("#f1f5f9"),
  smsCredit: boolean("sms_credit").notNull().default(true),
  smsLowStock: boolean("sms_low_stock").notNull().default(true),
  smsDaily: boolean("sms_daily").notNull().default(false),
  smsDailyTime: text("sms_daily_time").notNull().default("20:00"),
  smsRecipients: text("sms_recipients").array().notNull().default([]),
  smsSenderId: text("sms_sender_id").notNull().default("BRANCHCTRL"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
