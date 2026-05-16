import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, creditsTable } from "@workspace/db";
import {
  ListCreditsResponse,
  CreateCreditBody,
  RecordPaymentBody,
  RecordPaymentParams,
  GetCreditsSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toApiCredit(c: typeof creditsTable.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString() };
}

router.get("/credits/summary", async (_req, res): Promise<void> => {
  const credits = await db.select().from(creditsTable);
  const totalIssued = credits.reduce((s, c) => s + c.total, 0);
  const totalPaid = credits.reduce((s, c) => s + c.paid, 0);
  const outstanding = totalIssued - totalPaid;
  res.json(GetCreditsSummaryResponse.parse({ totalIssued, totalPaid, outstanding }));
});

router.get("/credits", async (_req, res): Promise<void> => {
  const credits = await db.select().from(creditsTable).orderBy(creditsTable.createdAt);
  res.json(ListCreditsResponse.parse(credits.map(toApiCredit)));
});

router.post("/credits", async (req, res): Promise<void> => {
  const parsed = CreateCreditBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [credit] = await db.insert(creditsTable).values({ ...parsed.data, paid: 0 }).returning();
  res.status(201).json(toApiCredit(credit));
});

router.post("/credits/:id/payment", async (req, res): Promise<void> => {
  const params = RecordPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = RecordPaymentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(creditsTable).where(eq(creditsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Credit not found" });
    return;
  }

  const newPaid = Math.min(existing.total, existing.paid + body.data.amount);
  const [updated] = await db
    .update(creditsTable)
    .set({ paid: newPaid })
    .where(eq(creditsTable.id, params.data.id))
    .returning();

  res.json(toApiCredit(updated));
});

export default router;
