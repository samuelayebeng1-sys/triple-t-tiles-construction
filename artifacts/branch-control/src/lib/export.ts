import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { GHS, pct } from "./format";

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
}

function companyName() {
  return localStorage.getItem("bc_company") || "BranchControl";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GH", {
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── PDF ─────────────────────────────────────────────────── */
export function exportPDF(entries: ExportEntry[], period: string, branchFilter: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const company = companyName();
  const generated = new Date().toLocaleDateString("en-GH", { dateStyle: "long" });

  const totalSales  = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = entries.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems  = entries.reduce((s, e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  const pageW = doc.internal.pageSize.getWidth();

  /* ── Header band ── */
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(company, 10, 9);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Sales History Report", 10, 15);
  doc.text(`Period: ${period}  ·  Branch: ${branchFilter === "All" ? "All Branches" : branchFilter}`, 10, 20);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text(`Generated: ${generated}`, pageW - 10, 12, { align: "right" });
  doc.text(`${entries.length} entries`, pageW - 10, 18, { align: "right" });

  /* ── Summary boxes ── */
  const boxes = [
    { label: "Total Sales",  value: GHS(totalSales) },
    { label: "Total Profit", value: GHS(totalProfit) },
    { label: "Cash",         value: GHS(totalCash) },
    { label: "MoMo",         value: GHS(totalMomo) },
    { label: "Bank",         value: GHS(totalBank) },
    { label: "Credit",       value: GHS(totalCredit) },
    { label: "Margin",       value: `${margin}%` },
    { label: "Items Sold",   value: String(totalItems) },
  ];
  const boxW = (pageW - 20) / boxes.length;
  boxes.forEach((b, i) => {
    const x = 10 + i * boxW;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, 26, boxW - 2, 14, 1, 1, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(b.label.toUpperCase(), x + (boxW - 2) / 2, 31, { align: "center" });
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(b.value, x + (boxW - 2) / 2, 37, { align: "center" });
  });

  /* ── Main table ── */
  autoTable(doc, {
    startY: 45,
    head: [["#", "Branch", "Date", "Time", "Total Sales", "Cash", "MoMo", "Bank", "Credit", "Profit", "Margin", "Items", "Status"]],
    body: entries.map((e, i) => [
      entries.length - i,
      e.branch,
      fmtDate(e.createdAt),
      fmtTime(e.createdAt),
      GHS(e.totalAmount),
      e.totalCash > 0 ? GHS(e.totalCash) : "—",
      e.totalMomo > 0 ? GHS(e.totalMomo) : "—",
      (e.totalBank ?? 0) > 0 ? GHS(e.totalBank!) : "—",
      e.totalCredit > 0 ? GHS(e.totalCredit) : "—",
      GHS(e.totalProfit),
      `${pct(e.totalProfit, e.totalAmount)}%`,
      e.itemsSold,
      e.status,
    ]),
    foot: [["", `TOTAL (${entries.length})`, "", "", GHS(totalSales), GHS(totalCash), GHS(totalMomo), GHS(totalBank), GHS(totalCredit), GHS(totalProfit), `${margin}%`, totalItems, ""]],
    styles: { fontSize: 7.5, cellPadding: 2.5, font: "helvetica" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 7, halign: "left" },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0:  { cellWidth: 8,  halign: "center" },
      1:  { cellWidth: 22, fontStyle: "bold" },
      2:  { cellWidth: 22 },
      3:  { cellWidth: 16 },
      4:  { cellWidth: 24, fontStyle: "bold" },
      5:  { cellWidth: 22 },
      6:  { cellWidth: 22 },
      7:  { cellWidth: 22 },
      8:  { cellWidth: 22 },
      9:  { cellWidth: 22, textColor: [5, 150, 105] },
      10: { cellWidth: 16, halign: "center" },
      11: { cellWidth: 12, halign: "center" },
      12: { cellWidth: 18, halign: "center" },
    },
    margin: { left: 10, right: 10 },
  });

  /* ── Footer on every page ── */
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    const y = doc.internal.pageSize.getHeight() - 4;
    doc.text(`${company} · BranchControl by ChalePay · Confidential`, 10, y);
    doc.text(`Page ${p} of ${pageCount}`, pageW - 10, y, { align: "right" });
    doc.line(10, y - 2, pageW - 10, y - 2);
  }

  const fname = `${company}_SalesHistory_${period.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fname);
  return fname;
}

/* ── Excel ───────────────────────────────────────────────── */
export function exportExcel(entries: ExportEntry[], period: string, branchFilter: string) {
  const company  = companyName();
  const wb = XLSX.utils.book_new();

  const totalSales  = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = entries.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems  = entries.reduce((s, e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  /* ── Summary sheet ── */
  const summaryRows = [
    [company + " — Sales History Report"],
    [`Period: ${period}   |   Branch: ${branchFilter === "All" ? "All Branches" : branchFilter}   |   Generated: ${new Date().toLocaleDateString("en-GH", { dateStyle: "long" })}`],
    [],
    ["SUMMARY"],
    ["Total Sales",  totalSales],
    ["Total Profit", totalProfit],
    ["Cash",         totalCash],
    ["MoMo",         totalMomo],
    ["Bank",         totalBank],
    ["Credit",       totalCredit],
    ["Margin %",     Number(margin)],
    ["Items Sold",   totalItems],
    ["Entries",      entries.length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  /* ── Entries sheet ── */
  const headers = ["#", "Branch", "Date", "Time", "Total Sales (GH₵)", "Cash (GH₵)", "MoMo (GH₵)", "Bank (GH₵)", "Credit (GH₵)", "Profit (GH₵)", "Margin %", "Items Sold", "Status"];
  const rows = entries.map((e, i) => [
    entries.length - i,
    e.branch,
    fmtDate(e.createdAt),
    fmtTime(e.createdAt),
    e.totalAmount,
    e.totalCash,
    e.totalMomo,
    e.totalBank ?? 0,
    e.totalCredit,
    e.totalProfit,
    Number(pct(e.totalProfit, e.totalAmount)),
    e.itemsSold,
    e.status,
  ]);
  const totalsRow = [
    "",
    `TOTAL (${entries.length})`,
    "", "",
    totalSales, totalCash, totalMomo, totalBank, totalCredit, totalProfit,
    Number(margin), totalItems, "",
  ];

  const wsEntries = XLSX.utils.aoa_to_sheet([headers, ...rows, totalsRow]);
  wsEntries["!cols"] = [
    { wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEntries, "Sales Entries");

  const fname = `${company}_SalesHistory_${period.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fname);
  return fname;
}
