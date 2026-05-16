import { Router, type IRouter } from "express";
import { db, entriesTable, productsTable, stockLevelsTable } from "@workspace/db";
import { GetWeeklyAnalyticsResponse, GetTopProductsResponse } from "@workspace/api-zod";

const BRANCHES = ["Adenta", "Spintex", "Kasoa"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Sample top products data (would be computed from entry lines in a full implementation)
const SAMPLE_TOP_PRODUCTS = [
  { productCode: "CEM-50", name: "Cement 50kg", units: 412, revenue: 39552 },
  { productCode: "TILE-60", name: "Tiles 60x60", units: 230, revenue: 35650 },
  { productCode: "WC-001", name: "Roca WC", units: 28, revenue: 26600 },
  { productCode: "SHW-09", name: "Shower Mixer", units: 54, revenue: 21060 },
  { productCode: "SINK-01", name: "Stainless Sink", units: 38, revenue: 19760 },
];

const router: IRouter = Router();

router.get("/analytics/weekly", async (_req, res): Promise<void> => {
  // In a full implementation, this would aggregate from entry lines
  // Using sample data that matches the prototype
  const sampleData = {
    Spintex: [8200, 11300, 9800, 14200, 12600, 20400, 17800],
    Adenta: [5100, 6400, 7200, 9300, 8700, 11100, 9500],
    Kasoa: [1800, 2400, 2100, 3800, 3200, 5400, 4600],
  };

  const branches = BRANCHES.map(branch => ({
    branch,
    data: sampleData[branch as keyof typeof sampleData] ?? [0, 0, 0, 0, 0, 0, 0],
  }));

  res.json(GetWeeklyAnalyticsResponse.parse({ days: DAYS, branches }));
});

router.get("/analytics/top-products", async (_req, res): Promise<void> => {
  res.json(GetTopProductsResponse.parse(SAMPLE_TOP_PRODUCTS));
});

export default router;
