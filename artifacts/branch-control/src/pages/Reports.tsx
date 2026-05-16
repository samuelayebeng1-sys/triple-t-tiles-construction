import { useState } from "react";
import { useListReports, useGetReportsSummary, useGetStock, useListProducts } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES, WAREHOUSES } from "@/lib/format";
import { Printer, FileText, Table2, MessageSquare, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS = ["Today", "This Week", "This Month", "This Year"];
const BRANCH_FILTERS = ["All", ...BRANCHES];

// ── Export preview modals ────────────────────────────────────────────────────

function PdfPreviewModal({ reports, summary, onClose }: { reports: any[]; summary: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 rounded-t-2xl">
          <p className="text-sm font-black text-gray-700">PDF Preview</p>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="rounded-lg bg-gray-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-gray-900">
              Print / Save as PDF
            </button>
            <button onClick={onClose} className="rounded-lg bg-gray-200 p-1.5 hover:bg-gray-300"><X className="h-4 w-4" /></button>
          </div>
        </div>
        {/* PDF-style content */}
        <div className="p-8 font-sans text-gray-900 print:p-0" id="pdf-content">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-black">Sales Report</h1>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString("en-GH", { dateStyle: "full" })}</p>
              <p className="text-sm text-gray-500">BranchControl by ChalePay</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Generated automatically</p>
              <p>Confidential</p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-900 text-white rounded-xl p-5 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Total Revenue — All Branches</p>
            <p className="text-4xl font-black">{GHS(summary?.totalSales ?? 0)}</p>
            <div className="mt-3 grid grid-cols-4 gap-4 pt-3 border-t border-white/10 text-center">
              {[["Cash", GHS(summary?.totalCash ?? 0)], ["MoMo", GHS(summary?.totalMomo ?? 0)], ["Credit", GHS(summary?.totalCredit ?? 0)], ["Profit", GHS(summary?.totalProfit ?? 0)]].map(([l, v]) => (
                <div key={l}><p className="text-[10px] text-gray-400 uppercase tracking-widest">{l}</p><p className="text-sm font-black mt-0.5">{v}</p></div>
              ))}
            </div>
          </div>

          {/* Per-branch table */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {["Branch", "Date", "Items", "Cash", "MoMo", "Credit", "Profit", "Total"].map(h => (
                  <th key={h} className="border border-gray-200 px-3 py-2 text-left text-xs font-black uppercase text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-bold">{r.branch}</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-500">{r.date}</td>
                  <td className="border border-gray-200 px-3 py-2">{r.itemsSold}</td>
                  <td className="border border-gray-200 px-3 py-2 text-green-700 font-bold">{GHS(r.cash)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-blue-700 font-bold">{GHS(r.momo)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-red-700 font-bold">{GHS(r.credit)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-purple-700 font-bold">{GHS(r.profit)}</td>
                  <td className="border border-gray-200 px-3 py-2 font-black">{GHS(r.total)}</td>
                </tr>
              ))}
              <tr className="bg-gray-900 text-white">
                <td colSpan={2} className="border border-gray-700 px-3 py-2 font-black">TOTAL</td>
                <td className="border border-gray-700 px-3 py-2 font-black">{reports.reduce((s, r) => s + r.itemsSold, 0)}</td>
                <td className="border border-gray-700 px-3 py-2 font-black">{GHS(summary?.totalCash ?? 0)}</td>
                <td className="border border-gray-700 px-3 py-2 font-black">{GHS(summary?.totalMomo ?? 0)}</td>
                <td className="border border-gray-700 px-3 py-2 font-black">{GHS(summary?.totalCredit ?? 0)}</td>
                <td className="border border-gray-700 px-3 py-2 font-black">{GHS(summary?.totalProfit ?? 0)}</td>
                <td className="border border-gray-700 px-3 py-2 font-black">{GHS(summary?.totalSales ?? 0)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-6 text-xs text-gray-400 text-center">BranchControl by ChalePay · {new Date().toLocaleString("en-GH")}</p>
        </div>
      </div>
    </div>
  );
}

function ExcelPreviewModal({ reports, summary, onClose }: { reports: any[]; summary: any; onClose: () => void }) {
  function downloadCSV() {
    const rows = [
      ["Branch", "Date", "Items Sold", "Cash (GHS)", "MoMo (GHS)", "Credit (GHS)", "Profit (GHS)", "Total (GHS)"],
      ...reports.map(r => [r.branch, r.date, r.itemsSold, r.cash, r.momo, r.credit, r.profit, r.total]),
      ["TOTAL", "", reports.reduce((s, r) => s + r.itemsSold, 0), summary?.totalCash ?? 0, summary?.totalMomo ?? 0, summary?.totalCredit ?? 0, summary?.totalProfit ?? 0, summary?.totalSales ?? 0],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sales_report_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-green-50 rounded-t-2xl">
          <p className="text-sm font-black text-green-800">Excel / CSV Preview</p>
          <div className="flex items-center gap-2">
            <button onClick={downloadCSV} className="rounded-lg bg-green-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-800">
              Download CSV
            </button>
            <button onClick={onClose} className="rounded-lg bg-gray-200 p-1.5 hover:bg-gray-300"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">Summary</p>
            <div className="flex gap-4 text-sm flex-wrap">
              {[["Total", GHS(summary?.totalSales ?? 0)], ["Cash", GHS(summary?.totalCash ?? 0)], ["MoMo", GHS(summary?.totalMomo ?? 0)], ["Credit", GHS(summary?.totalCredit ?? 0)], ["Profit", GHS(summary?.totalProfit ?? 0)]].map(([l, v]) => (
                <span key={l} className="font-bold">{l}: <strong className="text-green-800">{v}</strong></span>
              ))}
            </div>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-green-600 text-white">
                {["Branch", "Date", "Items", "Cash", "MoMo", "Credit", "Profit", "Total"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-black whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-green-50"}>
                  <td className="px-3 py-2 font-bold border border-green-100">{r.branch}</td>
                  <td className="px-3 py-2 border border-green-100 text-gray-500">{r.date}</td>
                  <td className="px-3 py-2 border border-green-100">{r.itemsSold}</td>
                  <td className="px-3 py-2 border border-green-100 font-bold text-green-700">{GHS(r.cash)}</td>
                  <td className="px-3 py-2 border border-green-100 font-bold text-blue-700">{GHS(r.momo)}</td>
                  <td className="px-3 py-2 border border-green-100 font-bold text-red-700">{GHS(r.credit)}</td>
                  <td className="px-3 py-2 border border-green-100 font-bold text-purple-700">{GHS(r.profit)}</td>
                  <td className="px-3 py-2 border border-green-100 font-black">{GHS(r.total)}</td>
                </tr>
              ))}
              <tr className="bg-green-700 text-white font-black">
                <td colSpan={2} className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2">{reports.reduce((s, r) => s + r.itemsSold, 0)}</td>
                <td className="px-3 py-2">{GHS(summary?.totalCash ?? 0)}</td>
                <td className="px-3 py-2">{GHS(summary?.totalMomo ?? 0)}</td>
                <td className="px-3 py-2">{GHS(summary?.totalCredit ?? 0)}</td>
                <td className="px-3 py-2">{GHS(summary?.totalProfit ?? 0)}</td>
                <td className="px-3 py-2">{GHS(summary?.totalSales ?? 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Reports page ────────────────────────────────────────────────────────

export default function Reports() {
  const [period, setPeriod] = useState("Today");
  const [branchFilter, setBranchFilter] = useState("All");
  const [showPdf, setShowPdf] = useState(false);
  const [showExcel, setShowExcel] = useState(false);

  const { data: reports, isLoading: reportsLoading } = useListReports();
  const { data: summary, isLoading: summaryLoading } = useGetReportsSummary();
  const { data: stock } = useGetStock();
  const { data: products } = useListProducts();

  const totals = summary ?? { totalSales: 0, totalProfit: 0, totalCash: 0, totalMomo: 0, totalCredit: 0, totalItems: 0, marginPct: 0 };
  const filtered = (reports ?? []).filter(r => branchFilter === "All" || r.branch === branchFilter);
  const grandTotal = filtered.reduce((s, r) => s + r.total, 0);

  const warehouseValues = WAREHOUSES.map(w => {
    const val = (products ?? []).reduce((s, p) => {
      const q = (stock ?? []).find(x => x.location === w && x.productCode === p.code)?.quantity ?? 0;
      return s + p.cost * q;
    }, 0);
    return { name: w, val };
  });
  const totalWarehouseValue = warehouseValues.reduce((s, w) => s + w.val, 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-reports">
      {showPdf && <PdfPreviewModal reports={reports ?? []} summary={summary} onClose={() => setShowPdf(false)} />}
      {showExcel && <ExcelPreviewModal reports={reports ?? []} summary={summary} onClose={() => setShowExcel(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black text-foreground">Reports</h1>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button key={p} data-testid={`period-${p.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border-l-4 border-l-primary border border-border bg-card shadow-sm p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Today Summary — All Branches</p>
        {summaryLoading ? <Skeleton className="h-14 w-48 mt-3 rounded-xl" /> : (
          <h2 className="mt-3 text-5xl font-black text-foreground" data-testid="summary-total">{GHS(totals.totalSales)}</h2>
        )}
        <p className="text-muted-foreground mt-1">{totals.totalItems} items sold</p>

        {/* Payment breakdown */}
        <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Cash", value: GHS(totals.totalCash), color: "text-emerald-600" },
            { label: "MoMo", value: GHS(totals.totalMomo), color: "text-blue-600" },
            { label: "Credit", value: GHS(totals.totalCredit), color: "text-red-600" },
            { label: "Profit", value: GHS(totals.totalProfit), color: "text-purple-600" },
            { label: "Margin", value: `${totals.marginPct}%`, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`mt-1.5 text-xl font-black ${color}`}>{summaryLoading ? "..." : value}</p>
            </div>
          ))}
        </div>

        {/* Warehouse stock values */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Warehouse Stock Value</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {warehouseValues.map(({ name, val }) => (
              <div key={name} className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs font-black text-muted-foreground">{name}</p>
                <p className="mt-1.5 text-lg font-black text-foreground">{GHS(val)}</p>
              </div>
            ))}
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
              <p className="text-xs font-black text-primary">Total Warehouse</p>
              <p className="mt-1.5 text-lg font-black text-foreground">{GHS(totalWarehouseValue)}</p>
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all">
            <Printer className="h-3.5 w-3.5" /> Print Report
          </button>
          <button data-testid="button-export-pdf" onClick={() => setShowPdf(true)}
            className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700 transition-all">
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button data-testid="button-export-excel" onClick={() => setShowExcel(true)}
            className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-600 transition-all">
            <Table2 className="h-3.5 w-3.5" /> Export Excel / CSV
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-all">
            <MessageSquare className="h-3.5 w-3.5" /> SMS Summary
          </button>
        </div>
      </div>

      {/* Branch filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground self-center">Filter</span>
          {BRANCH_FILTERS.map(b => (
            <button key={b} onClick={() => setBranchFilter(b)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${branchFilter === b ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
              {b}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <div className="text-right">
            <p className="text-xs font-bold text-muted-foreground">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</p>
            <p className="text-xl font-black text-foreground">{GHS(grandTotal)} total</p>
          </div>
        )}
      </div>

      {/* Reports list */}
      {reportsLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No reports yet. Use Enter Book to start recording sales.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="rounded-2xl border border-border bg-card shadow-sm p-5" data-testid={`card-report-${r.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-black text-foreground text-lg">{r.branch}</p>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">{r.date}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{r.status}</span>
                  </div>
                  <p className="text-3xl font-black text-foreground">{GHS(r.total)}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.itemsSold} items sold</p>
                </div>
                <div className="text-right text-sm space-y-1 shrink-0">
                  <div className="flex gap-2 justify-end"><span className="text-xs font-bold text-muted-foreground">Cash</span><span className="font-black text-emerald-600">{GHS(r.cash)}</span></div>
                  <div className="flex gap-2 justify-end"><span className="text-xs font-bold text-muted-foreground">MoMo</span><span className="font-black text-blue-600">{GHS(r.momo)}</span></div>
                  <div className="flex gap-2 justify-end"><span className="text-xs font-bold text-muted-foreground">Credit</span><span className="font-black text-red-600">{GHS(r.credit)}</span></div>
                  <div className="flex gap-2 justify-end"><span className="text-xs font-bold text-muted-foreground">Profit</span><span className="font-black text-purple-600">{GHS(r.profit)}</span></div>
                  {/* Warehouse value for this branch */}
                  <div className="flex gap-2 justify-end pt-1 border-t border-border">
                    <span className="text-xs font-bold text-muted-foreground">Wh. Stock</span>
                    <span className="font-black text-foreground">{GHS(totalWarehouseValue)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, pct(r.profit, r.total))}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct(r.profit, r.total)}% profit margin</p>
              </div>
            </div>
          ))}

          {/* Grand total footer */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grand Total · {branchFilter === "All" ? "All Branches" : branchFilter}</p>
                <p className="text-3xl font-black text-foreground mt-1">{GHS(grandTotal)}</p>
              </div>
              <div className="text-right text-sm space-y-1">
                <p>Cash: <strong className="text-emerald-600">{GHS(filtered.reduce((s, r) => s + r.cash, 0))}</strong></p>
                <p>MoMo: <strong className="text-blue-600">{GHS(filtered.reduce((s, r) => s + r.momo, 0))}</strong></p>
                <p>Credit: <strong className="text-red-600">{GHS(filtered.reduce((s, r) => s + r.credit, 0))}</strong></p>
                <p>Profit: <strong className="text-purple-600">{GHS(filtered.reduce((s, r) => s + r.profit, 0))}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
