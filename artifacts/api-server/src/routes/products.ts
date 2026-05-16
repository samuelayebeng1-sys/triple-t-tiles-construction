import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable, insertProductSchema } from "@workspace/db";
import { ListProductsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.id);
  res.json(ListProductsResponse.parse(products));
});

router.post("/products", async (req, res): Promise<void> => {
  const body = insertProductSchema.parse(req.body);
  const [product] = await db.insert(productsTable).values(body).returning();
  res.status(201).json(product);
});

router.put("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = insertProductSchema.partial().parse(req.body);
  const [product] = await db.update(productsTable).set(body).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(product);
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).end();
});

export default router;
