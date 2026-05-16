import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, locationsTable, insertLocationSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/locations", async (_req, res): Promise<void> => {
  const locs = await db.select().from(locationsTable).orderBy(locationsTable.id);
  res.json(locs);
});

router.post("/locations", async (req, res): Promise<void> => {
  const body = insertLocationSchema.parse(req.body);
  const [loc] = await db.insert(locationsTable).values(body).returning();
  res.status(201).json(loc);
});

router.put("/locations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = insertLocationSchema.partial().parse(req.body);
  const [loc] = await db.update(locationsTable).set(body).where(eq(locationsTable.id, id)).returning();
  if (!loc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(loc);
});

router.delete("/locations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.status(204).end();
});

export default router;
