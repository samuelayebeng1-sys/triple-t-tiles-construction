import { pgTable, serial, integer, text, doublePrecision } from "drizzle-orm/pg-core";
import { entriesTable } from "./entries";

export const entryItemsTable = pgTable("entry_items", {
  id:            serial("id").primaryKey(),
  entryId:       integer("entry_id").notNull().references(() => entriesTable.id, { onDelete: "cascade" }),
  productCode:   text("product_code").notNull(),
  productName:   text("product_name").notNull(),
  unit:          text("unit").notNull().default(""),
  price:         doublePrecision("price").notNull(),
  cost:          doublePrecision("cost").notNull(),
  qty:           integer("qty").notNull(),
  amount:        doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  customerName:  text("customer_name"),
  customerPhone: text("customer_phone"),
});

export type EntryItem = typeof entryItemsTable.$inferSelect;
