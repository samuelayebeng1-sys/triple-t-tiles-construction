import { Router, type IRouter } from "express";
import { db, entriesTable } from "@workspace/db";
import { ListReportsResponse, GetReportsSummaryResponse } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

function entryToReport(e: typeof entriesTable.$inferSelect) {
  return {
    id: e.id,
    branch: e.branch,
    date: new Date(e.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" }),
    cash: e.totalCash,
    momo: e.totalMomo,
    credit: e.totalCredit,
    total: e.totalAmount,
    profit: e.totalProfit,
    itemsSold: e.itemsSold,
    status: e.status,
  };
}

router.get("/reports", async (_req, res): Promise<void> => {
  const entries = await db.select().from(entriesTable).orderBy(desc(entriesTable.createdAt));
  res.json(ListReportsResponse.parse(entries.map(entryToReport)));
});

router.get("/reports/summary", async (_req, res): Promise<void> => {
  const entries = await db.select().from(entriesTable);
  const totalSales = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems = entries.reduce((s, e) => s + e.itemsSold, 0);
  const marginPct = totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0;
  res.json(GetReportsSummaryResponse.parse({ totalSales, totalProfit, totalCash, totalMomo, totalCredit, totalItems, marginPct }));
});

export default router;
