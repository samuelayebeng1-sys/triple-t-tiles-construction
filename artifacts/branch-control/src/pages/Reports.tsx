import { useEffect, useState } from "react";
import { useListReports, useGetReportsSummary } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { previewReportPDF, exportReportPDF, exportReportExcel, getReportExcelPreviewData, formatPeriodLabel, type ReportEntry } from "@/lib/export";
import ExcelPreviewModal from "@/components/ExcelPreviewModal";
import { FileText, Table2, Download, Loader2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const PERIODS = ["Today", "This Week", "This Month", "This Year"];
const BRANCH_FILTERS = ["All", ...BRANCHES];

/* ── PDF Preview Modal (iframe) ── */
function PdfPreviewModal({ reports, period, branchFilter, onClose }: {
  reports: ReportEntry[]; period: string; branchFilter: string; onClose: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    const url = previewReportPDF(reports, period, branchFilter);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, []);

  function handleSave() {
    setSaving(true);
    setTimeout(() => { exportReportPDF(reports, period, branchFilter); setSaving(false); onClose(); }, 50);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", bounce: 0.15 }}
          onClick={e => e.stopPropagation()}
          className="flex flex-col h-full max-w-6xl w-full mx-auto bg-card shadow-2xl overflow-hidden"
          style={{ marginTop: "3vh", borderRadius: "1.5rem 1.5rem 0 0" }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-red-600"/>
              </div>
              <div>
                <p className="font-black text-sm text-foreground">PDF Preview</p>
                <p className="text-xs text-muted-foreground">
                  {formatPeriodLabel(period)} · {branchFilter === "All" ? "All Branches" : branchFilter} · {reports.length} report{reports.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-black hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                Download PDF
              </button>
              <button onClick={onClose} className="rounded-xl bg-muted p-2.5 hover:bg-muted/70 transition-colors">
                <X className="h-4 w-4"/>
              </button>
            </div>
          </div>
          <div className="flex-1 bg-muted/30 overflow-hidden">
            {blobUrl ? (
              <iframe src={blobUrl} className="w-full h-full border-0" title="PDF Preview"/>
            ) : (
              <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin"/>
                <span className="font-bold">Generating preview…</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Reports() {
  const [period, setPeriod]           = useState("Today");
  const [branchFilter, setBranchFilter] = useState("All");
  const [showPdf, setShowPdf]         = useState(false);
  const [showExcel, setShowExcel]     = useState(false);

  const { data: reports, isLoading: reportsLoading } = useListReports();
  const { data: summary, isLoading: summaryLoading } = useGetReportsSummary();

  const totals = summary ?? { totalSales: 0, totalProfit: 0, totalCash: 0, totalMomo: 0, totalBank: 0, totalCredit: 0, totalItems: 0, marginPct: 0 };
  const filtered = (reports ?? []).filter(r => branchFilter === "All" || r.branch === branchFilter) as ReportEntry[];
  const grandTotal = filtered.reduce((s, r) => s + r.total, 0);

  const excelData = showExcel ? getReportExcelPreviewData(filtered, period, branchFilter) : null;
  const excelFilename = `BranchControl_SalesReport_${period.replace(/\s+/g, "_")}.xlsx`;

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-reports">

      {/* PDF preview modal */}
      {showPdf && (
        <PdfPreviewModal
          reports={filtered} period={period} branchFilter={branchFilter}
          onClose={() => setShowPdf(false)}
        />
      )}

      {/* Excel preview modal */}
      {excelData && (
        <ExcelPreviewModal
          data={excelData}
          filename={excelFilename}
          onDownload={() => exportReportExcel(filtered, period, branchFilter)}
          onClose={() => setShowExcel(false)}
        />
      )}

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

        <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            { label: "Cash",   value: GHS(totals.totalCash),   color: "text-emerald-600" },
            { label: "MoMo",   value: GHS(totals.totalMomo),   color: "text-blue-600" },
            { label: "Bank",   value: GHS(totals.totalBank),   color: "text-indigo-600" },
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

        {/* Export buttons */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            data-testid="button-export-pdf"
            onClick={() => filtered.length > 0 && setShowPdf(true)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5 text-red-500" />
            Export PDF
          </button>
          <button
            data-testid="button-excel"
            onClick={() => filtered.length > 0 && setShowExcel(true)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all disabled:opacity-50"
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
                  {r.bank > 0 && (
                    <div className="flex gap-2 justify-end">
                      <span className="text-xs font-bold text-muted-foreground">Bank</span>
                      <span className="font-black text-indigo-600">{GHS(r.bank)}</span>
                    </div>
                  )}
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
