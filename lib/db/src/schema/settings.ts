import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("Aseda Building Materials"),
  phone: text("phone").notNull().default("030 291 4400"),
  email: text("email").notNull().default("owner@asedabm.com"),
  tin: text("tin").notNull().default("GH-TIN-20291"),
  location: text("location").notNull().default("Accra, Ghana"),
  smsCredit: boolean("sms_credit").notNull().default(true),
  smsLowStock: boolean("sms_low_stock").notNull().default(true),
  smsDaily: boolean("sms_daily").notNull().default(false),
  smsSenderId: text("sms_sender_id").notNull().default("ASEDASTOCK"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
