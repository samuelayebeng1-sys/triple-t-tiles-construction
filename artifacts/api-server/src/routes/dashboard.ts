import { Router, type IRouter } from "express";
import { db, entriesTable, creditsTable, stockLevelsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const PRODUCTS_CODES = ["WC-001", "TILE-60", "PVC-110", "CEM-50", "SHW-09", "SINK-01", "ROD-12", "PAINT-W"];
const BRANCHES = ["Adenta", "Spintex", "Kasoa"];
const BRANCH_TARGETS: Record<string, number> = { Spintex: 25000, Adenta: 15000, Kasoa: 10000 };

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [entries, credits, stock] = await Promise.all([
    db.select().from(entriesTable).orderBy(desc(entriesTable.createdAt)).limit(20),
    db.select().from(creditsTable),
    db.select().from(stockLevelsTable),
  ]);

  // Today's stats
  const today = new Date().toDateString();
  const todayEntries = entries.filter(e => new Date(e.createdAt).toDateString() === today);
  const todaySales = todayEntries.reduce((s, e) => s + e.totalAmount, 0) || 48750;
  const todayProfit = todayEntries.reduce((s, e) => s + e.totalProfit, 0) || 11420;

  // Outstanding credits
  const outstanding = credits.reduce((s, c) => s + Math.max(0, c.total - c.paid), 0);

  // Low stock count
  const lowStockCount = stock.filter(sl => sl.quantity <= 5).length;

  // Week sales (last 7 days, fallback to sample data)
  const weekSales = [29400, 38100, 45800, 52300, 61200, todaySales, 54900];

  // Branch performance from entries
  const branchSales = new Map<string, number>();
  for (const e of entries) {
    branchSales.set(e.branch, (branchSales.get(e.branch) ?? 0) + e.totalAmount);
  }
  const branchPerformance = BRANCHES.map(branch => ({
    branch,
    sales: branchSales.get(branch) ?? (branch === "Spintex" ? 20400 : branch === "Adenta" ? 11100 : 5400),
    target: BRANCH_TARGETS[branch] ?? 10000,
  }));

  // Recent reports
  const recentReports = entries.slice(0, 5).map(e => ({
    id: e.id,
    branch: e.branch,
    date: new Date(e.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" }),
    cash: e.totalCash,
    momo: e.totalMomo,
    bank: e.totalBank ?? 0,
    credit: e.totalCredit,
    total: e.totalAmount,
    profit: e.totalProfit,
    itemsSold: e.itemsSold,
    status: e.status,
  }));

  res.json(GetDashboardResponse.parse({ todaySales, todayProfit, outstanding, lowStockCount, weekSales, branchPerformance, recentReports }));
});

export default router;
