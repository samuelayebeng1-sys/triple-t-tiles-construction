import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, stockLevelsTable, transfersTable, deliveriesTable } from "@workspace/db";
import {
  GetStockResponse,
  CreateTransferBody,
  CreateDeliveryBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stock", async (_req, res): Promise<void> => {
  const stock = await db.select().from(stockLevelsTable);
  res.json(GetStockResponse.parse(stock));
});

router.post("/stock/transfers", async (req, res): Promise<void> => {
  const parsed = CreateTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { fromLocation, toLocation, productCode, quantity } = parsed.data;

  if (fromLocation === toLocation) {
    res.status(400).json({ error: "From and To locations must be different" });
    return;
  }

  // Decrement from source
  await db
    .update(stockLevelsTable)
    .set({ quantity: sql`GREATEST(0, ${stockLevelsTable.quantity} - ${quantity})` })
    .where(
      sql`${stockLevelsTable.location} = ${fromLocation} AND ${stockLevelsTable.productCode} = ${productCode}`
    );

  // Increment at destination
  await db
    .update(stockLevelsTable)
    .set({ quantity: sql`${stockLevelsTable.quantity} + ${quantity}` })
    .where(
      sql`${stockLevelsTable.location} = ${toLocation} AND ${stockLevelsTable.productCode} = ${productCode}`
    );

  const now = new Date().toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
  const [transfer] = await db
    .insert(transfersTable)
    .values({ fromLocation, toLocation, productCode, quantity, createdAt: now })
    .returning();

  res.status(201).json(transfer);
});

router.post("/stock/deliveries", async (req, res): Promise<void> => {
  const parsed = CreateDeliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { warehouse, productCode, quantity, supplier } = parsed.data;

  await db
    .update(stockLevelsTable)
    .set({ quantity: sql`${stockLevelsTable.quantity} + ${quantity}` })
    .where(
      sql`${stockLevelsTable.location} = ${warehouse} AND ${stockLevelsTable.productCode} = ${productCode}`
    );

  const now = new Date().toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
  const [delivery] = await db
    .insert(deliveriesTable)
    .values({ warehouse, productCode, quantity, supplier, createdAt: now })
    .returning();

  res.status(201).json(delivery);
});

export default router;
