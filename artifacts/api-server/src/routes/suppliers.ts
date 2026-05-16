import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/suppliers", async (_req, res): Promise<void> => {
  const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(suppliers);
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const { name, phone = "", email = "", contact = "", notes = "" } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [created] = await db.insert(suppliersTable).values({ name, phone, email, contact, notes }).returning();
  res.status(201).json(created);
});

router.put("/suppliers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, phone = "", email = "", contact = "", notes = "" } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [updated] = await db.update(suppliersTable).set({ name, phone, email, contact, notes }).where(eq(suppliersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(updated);
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.status(204).send();
});

export default router;
