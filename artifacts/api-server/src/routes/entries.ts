import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, entriesTable, stockLevelsTable, productsTable } from "@workspace/db";
import { ListEntriesResponse, CreateEntryBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/entries", async (_req, res): Promise<void> => {
  const entries = await db.select().from(entriesTable).orderBy(entriesTable.createdAt);
  res.json(ListEntriesResponse.parse(entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() }))));
});

router.post("/entries", async (req, res): Promise<void> => {
  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { branch, lines } = parsed.data;

  // Fetch products for pricing
  const products = await db.select().from(productsTable);
  const productMap = new Map(products.map(p => [p.code, p]));

  let totalCash = 0, totalMomo = 0, totalCredit = 0, totalProfit = 0, itemsSold = 0;

  for (const line of lines) {
    const qty = line.quantitySold;
    if (!qty) continue;
    const p = productMap.get(line.productCode);
    if (!p) continue;

    const amount = qty * p.price;
    itemsSold += qty;
    totalProfit += qty * (p.price - p.cost);

    if (line.paymentMethod === "Cash") totalCash += amount;
    else if (line.paymentMethod === "MoMo") totalMomo += amount;
    else if (line.paymentMethod === "Credit") totalCredit += amount;
    else if (line.paymentMethod === "Split") {
      const amtPaid = line.amountPaid ?? 0;
      totalCash += amtPaid;
      totalCredit += Math.max(0, amount - amtPaid);
    }

    // Decrement stock at branch
    await db
      .update(stockLevelsTable)
      .set({ quantity: sql`GREATEST(0, ${stockLevelsTable.quantity} - ${qty})` })
      .where(
        sql`${stockLevelsTable.location} = ${branch} AND ${stockLevelsTable.productCode} = ${line.productCode}`
      );
  }

  const totalAmount = totalCash + totalMomo + totalCredit;

  const [entry] = await db
    .insert(entriesTable)
    .values({ branch, totalCash, totalMomo, totalCredit, totalAmount, totalProfit, itemsSold, status: "LOCKED" })
    .returning();

  res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
});

export default router;
