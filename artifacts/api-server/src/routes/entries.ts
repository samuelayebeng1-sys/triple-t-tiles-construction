import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, entriesTable, entryItemsTable, stockLevelsTable, productsTable } from "@workspace/db";
import { ListEntriesResponse, CreateEntryBody, GetEntryItemsResponse } from "@workspace/api-zod";
import { notifyCreditSale, notifyLowStock, LOW_STOCK_THRESHOLD } from "../lib/notifications.js";

const router: IRouter = Router();

router.get("/entries", async (_req, res): Promise<void> => {
  const entries = await db.select().from(entriesTable).orderBy(entriesTable.createdAt);
  res.json(ListEntriesResponse.parse(entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() }))));
});

router.get("/entries/:id/items", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid entry id" }); return; }
  const items = await db.select().from(entryItemsTable).where(eq(entryItemsTable.entryId, id));
  res.json(GetEntryItemsResponse.parse(items));
});

router.post("/entries", async (req, res): Promise<void> => {
  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { branch, lines } = parsed.data;

  const products = await db.select().from(productsTable);
  const productMap = new Map(products.map(p => [p.code, p]));

  let totalCash = 0, totalMomo = 0, totalBank = 0, totalCredit = 0, totalProfit = 0, itemsSold = 0;

  type ItemRow = {
    entryId: number;
    productCode: string;
    productName: string;
    unit: string;
    price: number;
    cost: number;
    qty: number;
    amount: number;
    paymentMethod: string;
    customerName: string | null;
    customerPhone: string | null;
  };

  const itemRows: Omit<ItemRow, "entryId">[] = [];

  for (const line of lines) {
    const qty = line.quantitySold;
    if (!qty) continue;
    const p = productMap.get(line.productCode);
    if (!p) continue;

    const amount = qty * p.price;
    itemsSold += qty;
    totalProfit += qty * (p.price - p.cost);

    let linePayment = line.paymentMethod;
    if (line.paymentMethod === "Cash")   totalCash  += amount;
    else if (line.paymentMethod === "MoMo")   totalMomo  += amount;
    else if (line.paymentMethod === "Bank")   totalBank  += amount;
    else if (line.paymentMethod === "Credit") totalCredit += amount;
    else if (line.paymentMethod === "Split") {
      const amtPaid = line.amountPaid ?? 0;
      totalCash   += amtPaid;
      totalCredit += Math.max(0, amount - amtPaid);
      linePayment = "Split";
    }

    itemRows.push({
      productCode:   p.code,
      productName:   p.name,
      unit:          p.unit,
      price:         p.price,
      cost:          p.cost,
      qty,
      amount,
      paymentMethod: linePayment,
      customerName:  line.customerName ?? null,
      customerPhone: line.customerPhone ?? null,
    });

    await db
      .update(stockLevelsTable)
      .set({ quantity: sql`GREATEST(0, ${stockLevelsTable.quantity} - ${qty})` })
      .where(sql`${stockLevelsTable.location} = ${branch} AND ${stockLevelsTable.productCode} = ${line.productCode}`);
  }

  const totalAmount = totalCash + totalMomo + totalBank + totalCredit;

  const [entry] = await db
    .insert(entriesTable)
    .values({ branch, totalCash, totalMomo, totalBank, totalCredit, totalAmount, totalProfit, itemsSold, status: "LOCKED" })
    .returning();

  if (itemRows.length > 0) {
    await db.insert(entryItemsTable).values(itemRows.map(r => ({ ...r, entryId: entry.id })));
  }

  // Respond first so the request isn't blocked on outbound SMS calls.
  res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });

  // Fire-and-forget notifications.
  void (async () => {
    try {
      // Credit sale alert
      if (totalCredit > 0) {
        const creditRow = itemRows.find(r => r.paymentMethod === "Credit" || r.paymentMethod === "Split");
        const productSummary = itemRows
          .filter(r => r.paymentMethod === "Credit" || r.paymentMethod === "Split")
          .map(r => `${r.qty} × ${r.productName}`)
          .slice(0, 3)
          .join(", ");
        await notifyCreditSale({
          branch,
          customerName: creditRow?.customerName ?? null,
          customerPhone: creditRow?.customerPhone ?? null,
          creditAmount: totalCredit,
          productSummary: productSummary || "items",
        });
      }

      // Low-stock alert: re-read stock for the affected branch+products and report any at/under threshold.
      const codes = Array.from(new Set(itemRows.map(r => r.productCode)));
      if (codes.length > 0) {
        const lows = await db
          .select({ productCode: stockLevelsTable.productCode, quantity: stockLevelsTable.quantity })
          .from(stockLevelsTable)
          .where(sql`${stockLevelsTable.location} = ${branch} AND ${stockLevelsTable.productCode} = ANY(${codes}) AND ${stockLevelsTable.quantity} <= ${LOW_STOCK_THRESHOLD}`);
        if (lows.length > 0) {
          const nameByCode = new Map(itemRows.map(r => [r.productCode, r.productName]));
          await notifyLowStock(
            lows.map(l => ({
              productName: nameByCode.get(l.productCode) ?? l.productCode,
              location: branch,
              quantity: l.quantity,
            }))
          );
        }
      }
    } catch (err) {
      // Already logged inside notifications; swallow to avoid unhandled rejection.
      void err;
    }
  })();
});

export default router;
