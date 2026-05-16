import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { ListProductsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.id);
  res.json(ListProductsResponse.parse(products));
});

router.put("/products/:code/pricing", async (req, res): Promise<void> => {
  const { code } = req.params;
  const { price, cost } = req.body;
  if (price == null && cost == null) {
    res.status(400).json({ error: "price or cost required" });
    return;
  }
  const updates: Record<string, number> = {};
  if (price != null) updates.price = Number(price);
  if (cost != null) updates.cost = Number(cost);
  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.code, code))
    .returning();
  if (!updated) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(updated);
});

export default router;
