import { useState } from "react";
import { useListReports, useGetReportsSummary } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { FileText, Table2, X, CheckCircle2, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const PERIODS = ["Today", "This Week", "This Month", "This Year"];
const BRANCH_FILTERS = ["All", ...BRANCHES];

type ExportType = "pdf" | "excel" | null;

function ExportModal({ type, onClose, totals, filtered, period, branchFilter }: {
  type: ExportType;
  onClose: () => void;
  totals: any;
  filtered: any[];
  period: string;
  branchFilter: string;
}) {
  const [done, setDone] = useState(false);

  function handleExport() {
    setDone(true);
    setTimeout(onClose, 2000);
  }

  const isPdf = type === "pdf";
  const label = isPdf ? "PDF Report" : "Excel Spreadsheet";
  const filename = isPdf
    ? `BranchControl_Report_${period.replace(/\s+/g, "_")}.pdf`
    : `BranchControl_Report_${period.replace(/\s+/g, "_")}.xlsx`;

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="relative z-10 w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl p-7"
          >
            <button onClick={onClose} className="absolute right-5 top-5 rounded-xl bg-muted p-2 hover:bg-muted/70 transition-colors">
              <X className="h-4 w-4" />
            </button>

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-4"
                >
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="text-lg font-black text-foreground">Export Ready</p>
                  <p className="text-sm text-muted-foreground mt-1">{filename}</p>
                  <p className="text-xs text-muted-foreground/60 mt-3">Your file has been prepared for download.</p>
                </motion.div>
              ) : (
                <motion.div key="preview" initial={{ opacity: 1 }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPdf ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                      {isPdf ? <FileText className="h-5 w-5 text-red-600" /> : <Table2 className="h-5 w-5 text-emerald-600" />}
                    </div>
                    <div>
                      <p className="font-black text-foreground">Export {label}</p>
                      <p className="text-xs text-muted-foreground">{filename}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2 mb-5">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Preview</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Period</span>
                      <span className="font-bold text-foreground">{period}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Branch</span>
                      <span className="font-bold text-foreground">{branchFilter === "All" ? "All Branches" : branchFilter}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reports</span>
                      <span className="font-bold text-foreground">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Sales</span>
                      <span className="font-black text-foreground">{GHS(totals.totalSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Net Profit</span>
                      <span className="font-black text-emerald-600">{GHS(totals.totalProfit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-black text-purple-600">{totals.marginPct}%</span>
                    </div>
                    {isPdf && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Includes</span>
                        <span className="font-bold text-foreground">Charts, breakdown</span>
                      </div>
                    )}
                    {!isPdf && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sheets</span>
                        <span className="font-bold text-foreground">Summary, By Branch</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExport}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white transition-all hover:opacity-90 ${isPdf ? "bg-red-600" : "bg-emerald-600"}`}
                  >
                    <Download className="h-4 w-4" />
                    Download {label}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState("Today");
  const [branchFilter, setBranchFilter] = useState("All");
  const [exportModal, setExportModal] = useState<ExportType>(null);
  const { data: reports, isLoading: reportsLoading } = useListReports();
  const { data: summary, isLoading: summaryLoading } = useGetReportsSummary();

  const totals = summary ?? { totalSales: 0, totalProfit: 0, totalCash: 0, totalMomo: 0, totalCredit: 0, totalItems: 0, marginPct: 0 };
  const filtered = (reports ?? []).filter(r => branchFilter === "All" || r.branch === branchFilter);
  const grandTotal = filtered.reduce((s, r) => s + r.total, 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-reports">
      <ExportModal
        type={exportModal}
        onClose={() => setExportModal(null)}
        totals={totals}
        filtered={filtered}
        period={period}
        branchFilter={branchFilter}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black text-foreground">Reports</h1>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p}
              data-testid={`period-${p.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border-l-4 border-l-primary border border-border bg-card shadow-sm p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{period} Summary — All Branches</p>
        {summaryLoading ? (
          <Skeleton className="h-14 w-48 mt-3 rounded-xl" />
        ) : (
          <h2 className="mt-3 text-5xl font-black text-foreground" data-testid="summary-total">{GHS(totals.totalSales)}</h2>
        )}
        <p className="text-muted-foreground mt-1">{totals.totalItems} items sold</p>

        <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Cash",   value: GHS(totals.totalCash),   color: "text-emerald-600" },
            { label: "MoMo",   value: GHS(totals.totalMomo),   color: "text-blue-600" },
            { label: "Credit", value: GHS(totals.totalCredit), color: "text-red-600" },
            { label: "Profit", value: GHS(totals.totalProfit), color: "text-purple-600" },
            { label: "Margin", value: `${totals.marginPct}%`,  color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`mt-1.5 text-xl font-black ${color}`} data-testid={`summary-${label.toLowerCase()}`}>
                {summaryLoading ? "..." : value}
              </p>
            </div>
          ))}
        </div>

        {/* Export buttons only */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            data-testid="button-export-pdf"
            onClick={() => setExportModal("pdf")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all"
          >
            <FileText className="h-3.5 w-3.5 text-red-500" />
            Export PDF
          </button>
          <button
            data-testid="button-excel"
            onClick={() => setExportModal("excel")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all"
          >
            <Table2 className="h-3.5 w-3.5 text-emerald-500" />
            Excel
          </button>
        </div>
      </div>

      {/* Branch filter + grand total */}
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
            <p className="text-xs font-bold text-muted-foreground">Showing {filtered.length} report{filtered.length !== 1 ? "s" : ""}</p>
            <p className="text-xl font-black text-foreground">{GHS(grandTotal)} total</p>
          </div>
        )}
      </div>

      {/* Reports list */}
      {reportsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
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
                  <p className="text-3xl font-black text-foreground" data-testid={`report-total-${r.id}`}>{GHS(r.total)}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.itemsSold} items sold</p>
                </div>
                <div className="text-right text-sm space-y-1 shrink-0">
                  <div className="flex gap-2 justify-end">
                    <span className="text-xs font-bold text-muted-foreground">Cash</span>
                    <span className="font-black text-emerald-600">{GHS(r.cash)}</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <span className="text-xs font-bold text-muted-foreground">MoMo</span>
                    <span className="font-black text-blue-600">{GHS(r.momo)}</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <span className="text-xs font-bold text-muted-foreground">Credit</span>
                    <span className="font-black text-red-600">{GHS(r.credit)}</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <span className="text-xs font-bold text-muted-foreground">Profit</span>
                    <span className="font-black text-purple-600">{GHS(r.profit)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, pct(r.profit, r.total))}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct(r.profit, r.total)}% profit margin</p>
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
