import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { pct } from "./format";

/* ─────────────────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────────────────── */
function companyName() {
  return localStorage.getItem("bc_company") || "BranchControl";
}

/** jsPDF's built-in Helvetica doesn't support ₵ — use plain ASCII */
function c(n: number): string {
  return "GHS " + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}
function todayStr() {
  return new Date().toLocaleDateString("en-GH", { dateStyle: "long" });
}
function slug() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Converts a period key into a human-readable specific date range.
 * e.g. "Today" → "17 May 2026"
 *      "This Week" → "12 – 17 May 2026"
 *      "This Month" → "May 2026"
 */
export function formatPeriodLabel(period: string): string {
  const now = new Date();
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-GH", opts);

  if (period === "Today") {
    return fmt(now, { day: "numeric", month: "long", year: "numeric" });
  }
  if (period === "This Week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const sameMonth = start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    if (sameMonth) {
      return (
        fmt(start, { day: "numeric" }) + " – " +
        fmt(now, { day: "numeric", month: "long", year: "numeric" })
      );
    }
    return (
      fmt(start, { day: "numeric", month: "short" }) + " – " +
      fmt(now, { day: "numeric", month: "long", year: "numeric" })
    );
  }
  if (period === "This Month") {
    return fmt(now, { month: "long", year: "numeric" });
  }
  if (period === "This Year") {
    return String(now.getFullYear());
  }
  return period; // "All Time" etc.
}

function pdfHeader(doc: jsPDF, title: string, subtitle: string, count: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const co = companyName();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(co, 10, 9);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(title, 10, 15);
  doc.text(subtitle, 10, 20);
  doc.setFontSize(7);
  doc.text("Generated: " + todayStr(), pageW - 10, 12, { align: "right" });
  doc.text(count + " records", pageW - 10, 18, { align: "right" });
  return pageW;
}

function pdfFooters(doc: jsPDF) {
  const co = companyName();
  const pageW = doc.internal.pageSize.getWidth();
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    const y = doc.internal.pageSize.getHeight() - 4;
    doc.line(10, y - 2, pageW - 10, y - 2);
    doc.text(co + " | BranchControl by ChalePay | Confidential", 10, y);
    doc.text("Page " + p + " of " + pageCount, pageW - 10, y, { align: "right" });
  }
}

function pdfSummaryBoxes(doc: jsPDF, boxes: { label: string; value: string }[]) {
  const pageW = doc.internal.pageSize.getWidth();
  const boxW = (pageW - 20) / boxes.length;
  boxes.forEach((b, i) => {
    const x = 10 + i * boxW;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, 26, boxW - 2, 14, 1, 1, "F");
    doc.setFontSize(5.5); doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + (boxW - 2) / 2, 31, { align: "center" });
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(b.value, x + (boxW - 2) / 2, 37, { align: "center" });
  });
}

/* ─────────────────────────────────────────────────────────
   HISTORY  (entries from Enter Book)
───────────────────────────────────────────────────────── */
export interface EntryItem {
  id: number;
  entryId: number;
  productCode: string;
  productName: string;
  unit: string;
  price: number;
  cost: number;
  qty: number;
  amount: number;
  paymentMethod: string;
  customerName: string | null;
  customerPhone: string | null;
}

export interface ExportEntry {
  id: number;
  branch: string;
  createdAt: string;
  totalAmount: number;
  totalCash: number;
  totalMomo: number;
  totalBank?: number;
  totalCredit: number;
  totalProfit: number;
  itemsSold: number;
  status: string;
  items?: EntryItem[];
}

function buildHistoryPDF(entries: ExportEntry[], period: string, branchFilter: string): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const periodLabel = formatPeriodLabel(period);
  const totalSales  = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = entries.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems  = entries.reduce((s, e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  pdfHeader(doc, "Sales History Report",
    periodLabel + "  |  " + (branchFilter === "All" ? "All Branches" : branchFilter),
    entries.length);

  pdfSummaryBoxes(doc, [
    { label: "TOTAL SALES",  value: c(totalSales) },
    { label: "TOTAL PROFIT", value: c(totalProfit) },
    { label: "CASH",         value: c(totalCash) },
    { label: "MOMO",         value: c(totalMomo) },
    { label: "BANK",         value: c(totalBank) },
    { label: "CREDIT",       value: c(totalCredit) },
    { label: "MARGIN",       value: margin + "%" },
    { label: "ITEMS SOLD",   value: String(totalItems) },
  ]);

  const mainTable = autoTable(doc, {
    startY: 45,
    head: [["#", "Branch", "Date", "Time", "Total Sales", "Cash", "MoMo", "Bank", "Credit", "Profit", "Margin", "Items", "Status"]],
    body: entries.map((e, i) => [
      entries.length - i, e.branch,
      fmtDate(e.createdAt), fmtTime(e.createdAt),
      c(e.totalAmount),
      e.totalCash > 0        ? c(e.totalCash)   : "-",
      e.totalMomo > 0        ? c(e.totalMomo)   : "-",
      (e.totalBank ?? 0) > 0 ? c(e.totalBank!)  : "-",
      e.totalCredit > 0      ? c(e.totalCredit) : "-",
      c(e.totalProfit), pct(e.totalProfit, e.totalAmount) + "%",
      e.itemsSold, e.status,
    ]),
    foot: [["", "TOTAL (" + entries.length + ")", "", "",
      c(totalSales), c(totalCash), c(totalMomo), c(totalBank), c(totalCredit),
      c(totalProfit), margin + "%", totalItems, ""]],
    styles:             { fontSize: 7.5, cellPadding: 2.5, font: "helvetica" },
    headStyles:         { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 7 },
    footStyles:         { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 22, fontStyle: "bold" },
      2: { cellWidth: 22 }, 3: { cellWidth: 16 },
      4: { cellWidth: 26, fontStyle: "bold" },
      5: { cellWidth: 24 }, 6: { cellWidth: 24 },
      7: { cellWidth: 24 }, 8: { cellWidth: 24 },
      9: { cellWidth: 24, textColor: [5, 150, 105] },
      10: { cellWidth: 15, halign: "center" },
      11: { cellWidth: 12, halign: "center" },
      12: { cellWidth: 18, halign: "center" },
    },
    margin: { left: 10, right: 10 },
  });

  /* ── Line Items section ── */
  const entriesWithItems = entries.filter(e => e.items && e.items.length > 0);
  if (entriesWithItems.length > 0) {
    const pageW = doc.internal.pageSize.getWidth();
    let currentY = (mainTable as any).finalY + 10;

    /* Section divider */
    doc.setFillColor(15, 23, 42);
    doc.rect(10, currentY, pageW - 20, 7, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("DETAILED LINE ITEMS", 14, currentY + 4.5);
    currentY += 11;

    for (const entry of entriesWithItems) {
      const items = entry.items!;
      const entryTotal = items.reduce((s, it) => s + it.amount, 0);
      const entryProfit = items.reduce((s, it) => s + (it.price - it.cost) * it.qty, 0);

      /* Group header */
      const dateLabel = new Date(entry.createdAt).toLocaleDateString("en-GH", {
        day: "numeric", month: "long", year: "numeric",
      }).toUpperCase();
      const headerText = "LINE ITEMS  \u00B7  " + dateLabel + "  \u00B7  " + entry.branch.toUpperCase() +
        "  \u00B7  " + items.length + " product" + (items.length !== 1 ? "s" : "");

      doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(headerText, 10, currentY);
      doc.setDrawColor(203, 213, 225);
      doc.line(10, currentY + 1, pageW - 10, currentY + 1);
      currentY += 4;

      const itemTable = autoTable(doc, {
        startY: currentY,
        head: [["Code", "Product", "Price/Unit", "Qty", "Amount", "Payment", "Customer", "Phone"]],
        body: items.map(it => [
          it.productCode,
          it.productName,
          c(it.price) + "/" + (it.unit || "unit"),
          it.qty,
          c(it.amount),
          it.paymentMethod,
          it.customerName || "-",
          it.customerPhone || "-",
        ]),
        foot: [[
          "", "SUBTOTAL (" + items.length + ")",
          "", items.reduce((s, it) => s + it.qty, 0),
          c(entryTotal), "", "Profit: " + c(entryProfit), "",
        ]],
        styles:             { fontSize: 6.5, cellPadding: 1.8, font: "helvetica" },
        headStyles:         { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 6 },
        footStyles:         { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 6 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 18 }, 1: { cellWidth: 35, fontStyle: "bold" },
          2: { cellWidth: 28 }, 3: { cellWidth: 10, halign: "center" },
          4: { cellWidth: 26, fontStyle: "bold" }, 5: { cellWidth: 22 },
          6: { cellWidth: 30 }, 7: { cellWidth: 28 },
        },
        margin: { left: 10, right: 10 },
      });

      currentY = (itemTable as any).finalY + 6;
    }
  }

  pdfFooters(doc);
  return doc;
}

export function previewPDF(entries: ExportEntry[], period: string, branchFilter: string): string {
  const blob = buildHistoryPDF(entries, period, branchFilter).output("blob");
  return URL.createObjectURL(blob);
}

export function exportPDF(entries: ExportEntry[], period: string, branchFilter: string) {
  const fname = companyName() + "_SalesHistory_" + period.replace(/\s+/g, "_") + "_" + slug() + ".pdf";
  buildHistoryPDF(entries, period, branchFilter).save(fname);
  return fname;
}

export function exportExcel(entries: ExportEntry[], period: string, branchFilter: string) {
  const company     = companyName();
  const periodLabel = formatPeriodLabel(period);
  const totalSales  = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = entries.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems  = entries.reduce((s, e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);
  const wb = XLSX.utils.book_new();

  /* Summary sheet */
  const wsSummary = XLSX.utils.aoa_to_sheet([
    [company + " - Sales History Report"],
    ["Period: " + periodLabel + "   |   Branch: " + (branchFilter === "All" ? "All Branches" : branchFilter) + "   |   Generated: " + todayStr()],
    [],
    ["SUMMARY"],
    ["Total Sales (GHS)",  totalSales], ["Total Profit (GHS)", totalProfit],
    ["Cash (GHS)", totalCash], ["MoMo (GHS)", totalMomo],
    ["Bank (GHS)", totalBank], ["Credit (GHS)", totalCredit],
    ["Margin %", Number(margin)], ["Items Sold", totalItems],
    ["Total Entries", entries.length],
  ]);
  wsSummary["!cols"] = [{ wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  /* Sales Entries sheet */
  const headers = ["#", "Branch", "Date", "Time", "Total Sales (GHS)", "Cash (GHS)", "MoMo (GHS)", "Bank (GHS)", "Credit (GHS)", "Profit (GHS)", "Margin %", "Items Sold", "Status"];
  const wsEntries = XLSX.utils.aoa_to_sheet([
    headers,
    ...entries.map((e, i) => [
      entries.length - i, e.branch, fmtDate(e.createdAt), fmtTime(e.createdAt),
      e.totalAmount, e.totalCash, e.totalMomo, e.totalBank ?? 0, e.totalCredit,
      e.totalProfit, Number(pct(e.totalProfit, e.totalAmount)), e.itemsSold, e.status,
    ]),
    ["", "TOTAL (" + entries.length + ")", "", "", totalSales, totalCash, totalMomo, totalBank, totalCredit, totalProfit, Number(margin), totalItems, ""],
  ]);
  wsEntries["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsEntries, "Sales Entries");

  /* Line Items sheet */
  const allItems: any[][] = [];
  const liHeaders = ["Entry #", "Branch", "Date", "Code", "Product", "Unit", "Price (GHS)", "Cost (GHS)", "Qty", "Amount (GHS)", "Profit (GHS)", "Payment", "Customer", "Phone"];
  allItems.push(liHeaders);
  entries.forEach((e, ei) => {
    if (e.items && e.items.length > 0) {
      e.items.forEach(it => {
        allItems.push([
          entries.length - ei, e.branch, fmtDate(e.createdAt),
          it.productCode, it.productName, it.unit || "unit",
          it.price, it.cost, it.qty, it.amount,
          (it.price - it.cost) * it.qty,
          it.paymentMethod,
          it.customerName || "", it.customerPhone || "",
        ]);
      });
    }
  });
  if (allItems.length > 1) {
    const wsItems = XLSX.utils.aoa_to_sheet(allItems);
    wsItems["!cols"] = [
      { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 28 },
      { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 6 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, "Line Items");
  }

  const fname = company + "_SalesHistory_" + period.replace(/\s+/g, "_") + "_" + slug() + ".xlsx";
  XLSX.writeFile(wb, fname);
  return fname;
}

export function getExcelPreviewData(entries: ExportEntry[], period: string, branchFilter: string) {
  const periodLabel = formatPeriodLabel(period);
  const totalSales  = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = entries.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems  = entries.reduce((s, e) => s + e.itemsSold, 0);
  const totalLineItems = entries.reduce((s, e) => s + (e.items?.length ?? 0), 0);

  return {
    company: companyName(), period, periodLabel, branchFilter,
    summary: { totalSales, totalProfit, totalCash, totalMomo, totalBank, totalCredit, totalItems, margin: pct(totalProfit, totalSales) },
    headers: ["#", "Branch", "Date", "Time", "Total Sales", "Cash", "MoMo", "Bank", "Credit", "Profit", "Margin %", "Items", "Status"],
    rows: entries.map((e, i) => [
      String(entries.length - i), e.branch, fmtDate(e.createdAt), fmtTime(e.createdAt),
      c(e.totalAmount),
      e.totalCash > 0        ? c(e.totalCash)   : "—",
      e.totalMomo > 0        ? c(e.totalMomo)   : "—",
      (e.totalBank ?? 0) > 0 ? c(e.totalBank!)  : "—",
      e.totalCredit > 0      ? c(e.totalCredit) : "—",
      c(e.totalProfit), pct(e.totalProfit, e.totalAmount) + "%",
      String(e.itemsSold), e.status,
    ]),
    totalsRow: ["", "TOTAL (" + entries.length + ")", "", "", c(totalSales), c(totalCash), c(totalMomo), c(totalBank), c(totalCredit), c(totalProfit), pct(totalProfit, totalSales) + "%", String(totalItems), ""],
    lineItemsCount: totalLineItems,
    lineItemsSheets: totalLineItems > 0,
  };
}

/* ─────────────────────────────────────────────────────────
   REPORTS  (locked daily branch reports)
───────────────────────────────────────────────────────── */
export interface ReportEntry {
  id: number;
  branch: string;
  date: string;
  total: number;
  cash: number;
  momo: number;
  bank: number;
  credit: number;
  profit: number;
  itemsSold: number;
  status: string;
}

function buildReportPDF(reports: ReportEntry[], period: string, branchFilter: string): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const periodLabel = formatPeriodLabel(period);
  const totalSales  = reports.reduce((s, r) => s + r.total, 0);
  const totalProfit = reports.reduce((s, r) => s + r.profit, 0);
  const totalCash   = reports.reduce((s, r) => s + r.cash, 0);
  const totalMomo   = reports.reduce((s, r) => s + r.momo, 0);
  const totalBank   = reports.reduce((s, r) => s + r.bank, 0);
  const totalCredit = reports.reduce((s, r) => s + r.credit, 0);
  const totalItems  = reports.reduce((s, r) => s + r.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  pdfHeader(doc, "Sales Report",
    periodLabel + "  |  " + (branchFilter === "All" ? "All Branches" : branchFilter),
    reports.length);

  pdfSummaryBoxes(doc, [
    { label: "TOTAL SALES",  value: c(totalSales) },
    { label: "TOTAL PROFIT", value: c(totalProfit) },
    { label: "CASH",         value: c(totalCash) },
    { label: "MOMO",         value: c(totalMomo) },
    { label: "BANK",         value: c(totalBank) },
    { label: "CREDIT",       value: c(totalCredit) },
    { label: "MARGIN",       value: margin + "%" },
    { label: "ITEMS SOLD",   value: String(totalItems) },
  ]);

  autoTable(doc, {
    startY: 45,
    head: [["#", "Branch", "Date", "Total Sales", "Cash", "MoMo", "Bank", "Credit", "Profit", "Margin", "Items", "Status"]],
    body: reports.map((r, i) => [
      reports.length - i, r.branch, r.date,
      c(r.total),
      r.cash   > 0 ? c(r.cash)   : "-",
      r.momo   > 0 ? c(r.momo)   : "-",
      r.bank   > 0 ? c(r.bank)   : "-",
      r.credit > 0 ? c(r.credit) : "-",
      c(r.profit), pct(r.profit, r.total) + "%",
      r.itemsSold, r.status,
    ]),
    foot: [["", "TOTAL (" + reports.length + ")", "",
      c(totalSales), c(totalCash), c(totalMomo), c(totalBank), c(totalCredit),
      c(totalProfit), margin + "%", totalItems, ""]],
    styles:             { fontSize: 7.5, cellPadding: 2.5, font: "helvetica" },
    headStyles:         { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 7 },
    footStyles:         { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 24, fontStyle: "bold" },
      2: { cellWidth: 24 },
      3: { cellWidth: 28, fontStyle: "bold" },
      4: { cellWidth: 26 }, 5: { cellWidth: 26 },
      6: { cellWidth: 26 }, 7: { cellWidth: 26 },
      8: { cellWidth: 26, textColor: [5, 150, 105] },
      9: { cellWidth: 15, halign: "center" },
      10: { cellWidth: 12, halign: "center" },
      11: { cellWidth: 18, halign: "center" },
    },
    margin: { left: 10, right: 10 },
  });

  pdfFooters(doc);
  return doc;
}

export function previewReportPDF(reports: ReportEntry[], period: string, branchFilter: string): string {
  const blob = buildReportPDF(reports, period, branchFilter).output("blob");
  return URL.createObjectURL(blob);
}

export function exportReportPDF(reports: ReportEntry[], period: string, branchFilter: string) {
  const fname = companyName() + "_SalesReport_" + period.replace(/\s+/g, "_") + "_" + slug() + ".pdf";
  buildReportPDF(reports, period, branchFilter).save(fname);
  return fname;
}

export function exportReportExcel(reports: ReportEntry[], period: string, branchFilter: string) {
  const company     = companyName();
  const periodLabel = formatPeriodLabel(period);
  const totalSales  = reports.reduce((s, r) => s + r.total, 0);
  const totalProfit = reports.reduce((s, r) => s + r.profit, 0);
  const totalCash   = reports.reduce((s, r) => s + r.cash, 0);
  const totalMomo   = reports.reduce((s, r) => s + r.momo, 0);
  const totalBank   = reports.reduce((s, r) => s + r.bank, 0);
  const totalCredit = reports.reduce((s, r) => s + r.credit, 0);
  const totalItems  = reports.reduce((s, r) => s + r.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet([
    [company + " - Sales Report"],
    ["Period: " + periodLabel + "   |   Branch: " + (branchFilter === "All" ? "All Branches" : branchFilter) + "   |   Generated: " + todayStr()],
    [],
    ["SUMMARY"],
    ["Total Sales (GHS)",  totalSales], ["Total Profit (GHS)", totalProfit],
    ["Cash (GHS)", totalCash], ["MoMo (GHS)", totalMomo],
    ["Bank (GHS)", totalBank], ["Credit (GHS)", totalCredit],
    ["Margin %", Number(margin)], ["Items Sold", totalItems],
    ["Total Reports", reports.length],
  ]);
  wsSummary["!cols"] = [{ wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  const headers = ["#", "Branch", "Date", "Total Sales (GHS)", "Cash (GHS)", "MoMo (GHS)", "Bank (GHS)", "Credit (GHS)", "Profit (GHS)", "Margin %", "Items Sold", "Status"];
  const wsReports = XLSX.utils.aoa_to_sheet([
    headers,
    ...reports.map((r, i) => [
      reports.length - i, r.branch, r.date,
      r.total, r.cash, r.momo, r.bank, r.credit,
      r.profit, Number(pct(r.profit, r.total)), r.itemsSold, r.status,
    ]),
    ["", "TOTAL (" + reports.length + ")", "", totalSales, totalCash, totalMomo, totalBank, totalCredit, totalProfit, Number(margin), totalItems, ""],
  ]);
  wsReports["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsReports, "Reports");

  const fname = company + "_SalesReport_" + period.replace(/\s+/g, "_") + "_" + slug() + ".xlsx";
  XLSX.writeFile(wb, fname);
  return fname;
}

export function getReportExcelPreviewData(reports: ReportEntry[], period: string, branchFilter: string) {
  const periodLabel = formatPeriodLabel(period);
  const totalSales  = reports.reduce((s, r) => s + r.total, 0);
  const totalProfit = reports.reduce((s, r) => s + r.profit, 0);
  const totalCash   = reports.reduce((s, r) => s + r.cash, 0);
  const totalMomo   = reports.reduce((s, r) => s + r.momo, 0);
  const totalBank   = reports.reduce((s, r) => s + r.bank, 0);
  const totalCredit = reports.reduce((s, r) => s + r.credit, 0);
  const totalItems  = reports.reduce((s, r) => s + r.itemsSold, 0);
  return {
    company: companyName(), period, periodLabel, branchFilter,
    summary: { totalSales, totalProfit, totalCash, totalMomo, totalBank, totalCredit, totalItems, margin: pct(totalProfit, totalSales) },
    headers: ["#", "Branch", "Date", "Total Sales", "Cash", "MoMo", "Bank", "Credit", "Profit", "Margin %", "Items", "Status"],
    rows: reports.map((r, i) => [
      String(reports.length - i), r.branch, r.date,
      c(r.total),
      r.cash   > 0 ? c(r.cash)   : "—",
      r.momo   > 0 ? c(r.momo)   : "—",
      r.bank   > 0 ? c(r.bank)   : "—",
      r.credit > 0 ? c(r.credit) : "—",
      c(r.profit), pct(r.profit, r.total) + "%",
      String(r.itemsSold), r.status,
    ]),
    totalsRow: ["", "TOTAL (" + reports.length + ")", "", c(totalSales), c(totalCash), c(totalMomo), c(totalBank), c(totalCredit), c(totalProfit), pct(totalProfit, totalSales) + "%", String(totalItems), ""],
    lineItemsCount: 0,
    lineItemsSheets: false,
  };
}
