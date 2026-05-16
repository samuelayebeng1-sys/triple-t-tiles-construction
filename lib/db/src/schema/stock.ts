import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stockLevelsTable = pgTable("stock_levels", {
  id: serial("id").primaryKey(),
  location: text("location").notNull(),
  productCode: text("product_code").notNull(),
  quantity: integer("quantity").notNull().default(0),
});

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  productCode: text("product_code").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: text("created_at").notNull(),
});

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  warehouse: text("warehouse").notNull(),
  productCode: text("product_code").notNull(),
  quantity: integer("quantity").notNull(),
  supplier: text("supplier").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertStockLevelSchema = createInsertSchema(stockLevelsTable).omit({ id: true });
export type InsertStockLevel = z.infer<typeof insertStockLevelSchema>;
export type StockLevel = typeof stockLevelsTable.$inferSelect;

export const insertTransferSchema = createInsertSchema(transfersTable).omit({ id: true });
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfersTable.$inferSelect;

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({ id: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
