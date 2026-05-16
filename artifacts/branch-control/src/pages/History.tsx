import { useMemo, useState } from "react";
import { useListEntries } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Minus,
  CalendarDays, ChevronDown, ChevronUp,
  FileText, Table2, X, CheckCircle2, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── constants ─────────────────────────────────────────── */
const PERIODS = ["Today", "This Week", "This Month", "All Time"] as const;
type Period = typeof PERIODS[number];
const BRANCH_FILTERS = ["All", ...BRANCHES] as const;

const BRANCH_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  Adenta:  { dot: "#3b82f6", text: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30",    border: "border-blue-200 dark:border-blue-800" },
  Spintex: { dot: "#7c3aed", text: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
  Kasoa:   { dot: "#d97706", text: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800" },
};
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── helpers ────────────────────────────────────────────── */
function filterByPeriod(entries: any[], period: Period) {
  const now = new Date();
  return entries.filter(e => {
    const d = new Date(e.createdAt);
    if (period === "Today") return d.toDateString() === now.toDateString();
    if (period === "This Week") {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
      return d >= start;
    }
    if (period === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

function groupByDay(entries: any[]) {
  const map = new Map<string, any[]>();
  for (const e of entries) {
    const d = new Date(e.createdAt); d.setHours(0,0,0,0);
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()]
    .map(([key, es]) => ({ dateStr: key, date: new Date(key), entries: es }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/* ─── Export modal ───────────────────────────────────────── */
function ExportModal({ type, entries, branchFilter, period, onClose }: {
  type: "pdf" | "excel";
  entries: any[];
  branchFilter: string;
  period: string;
  onClose: () => void;
}) {
  const [done, setDone] = useState(false);
  const company = localStorage.getItem("bc_company") || "BranchControl";
  const today = new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });

  const totalSales  = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = entries.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  const filename = type === "pdf"
    ? `BranchControl_History_${period.replace(/\s+/g,"_")}.pdf`
    : `BranchControl_History_${period.replace(/\s+/g,"_")}.xlsx`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", bounce: 0.18 }}
          onClick={e => e.stopPropagation()}
          className="relative z-10 w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${type === "pdf" ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                {type === "pdf" ? <FileText className="h-4 w-4 text-red-600" /> : <Table2 className="h-4 w-4 text-emerald-600" />}
              </div>
              <div>
                <p className="font-black text-sm text-foreground">{type === "pdf" ? "PDF Preview" : "Excel Preview"}</p>
                <p className="text-xs text-muted-foreground">{filename}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl bg-muted p-2 hover:bg-muted/70 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-14">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-lg font-black text-foreground">Export Ready</p>
                <p className="text-sm text-muted-foreground mt-1">{filename}</p>
              </motion.div>
            ) : (
              <motion.div key="preview" className="p-4 space-y-4">
                {/* Document preview */}
                {type === "pdf" ? (
                  <div className="bg-white text-[#111] rounded-xl border border-gray-200 shadow-inner overflow-hidden text-[10px]">
                    <div className="bg-[#0f172a] px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-black text-sm">{company}</p>
                        <p className="text-white/50 text-[10px]">Sales History · {period} · {branchFilter === "All" ? "All Branches" : branchFilter}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/70 text-[10px]">{today}</p>
                        <p className="text-white/50 text-[10px]">{entries.length} entries</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 border-b border-gray-100">
                      {[["Total", GHS(totalSales)],["Profit",GHS(totalProfit)],["Cash",GHS(totalCash)],["MoMo",GHS(totalMomo)],["Bank",GHS(totalBank)],["Credit",GHS(totalCredit)]].map(([l,v]) => (
                        <div key={l} className="px-3 py-2 border-r border-gray-100 last:border-0">
                          <p className="text-gray-400 text-[8px] uppercase tracking-widest font-bold">{l}</p>
                          <p className="font-black mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-auto max-h-52">
                      <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-100">
                          {["Branch","Date","Total","Cash","MoMo","Bank","Credit","Profit","Margin"].map(h => (
                            <th key={h} className="px-3 py-1.5 text-left text-[8px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {entries.map((e, i) => (
                            <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                              <td className="px-3 py-1.5 font-bold">{e.branch}</td>
                              <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("en-GH",{dateStyle:"short"})}</td>
                              <td className="px-3 py-1.5 font-black">{GHS(e.totalAmount)}</td>
                              <td className="px-3 py-1.5 text-[#059669]">{GHS(e.totalCash)}</td>
                              <td className="px-3 py-1.5 text-[#2563eb]">{GHS(e.totalMomo)}</td>
                              <td className="px-3 py-1.5 text-[#4f46e5]">{GHS(e.totalBank??0)}</td>
                              <td className="px-3 py-1.5 text-[#dc2626]">{GHS(e.totalCredit)}</td>
                              <td className="px-3 py-1.5 text-[#7c3aed]">{GHS(e.totalProfit)}</td>
                              <td className="px-3 py-1.5 text-gray-500">{pct(e.totalProfit,e.totalAmount)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="bg-gray-100 border-t border-gray-200 font-black">
                          <td className="px-3 py-1.5 text-gray-700" colSpan={2}>TOTAL ({entries.length})</td>
                          <td className="px-3 py-1.5">{GHS(totalSales)}</td>
                          <td className="px-3 py-1.5 text-[#059669]">{GHS(totalCash)}</td>
                          <td className="px-3 py-1.5 text-[#2563eb]">{GHS(totalMomo)}</td>
                          <td className="px-3 py-1.5 text-[#4f46e5]">{GHS(totalBank)}</td>
                          <td className="px-3 py-1.5 text-[#dc2626]">{GHS(totalCredit)}</td>
                          <td className="px-3 py-1.5 text-[#7c3aed]">{GHS(totalProfit)}</td>
                          <td className="px-3 py-1.5 text-gray-500">{pct(totalProfit,totalSales)}%</td>
                        </tr></tfoot>
                      </table>
                    </div>
                    <div className="px-5 py-1.5 border-t border-gray-100 bg-gray-50 flex justify-between">
                      <p className="text-gray-300 text-[8px]">Generated by BranchControl · ChalePay</p>
                      <p className="text-gray-300 text-[8px]">{entries.length} records</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 overflow-hidden text-[10px] bg-white">
                    <div className="bg-[#1d6f42] px-4 py-2 flex items-center gap-2">
                      <Table2 className="h-3.5 w-3.5 text-white/80" />
                      <span className="text-white font-bold text-[11px]">{filename}</span>
                    </div>
                    <div className="flex bg-gray-100 border-b border-gray-200 px-2 pt-1.5 gap-1">
                      <div className="bg-white border border-gray-200 border-b-0 rounded-t px-3 py-1 text-[10px] font-black text-[#1d6f42]">History</div>
                    </div>
                    <div className="grid grid-cols-4 border-b border-gray-200 bg-[#e8f4f0]/60">
                      {[["TOTAL",GHS(totalSales)],["PROFIT",GHS(totalProfit)],["CASH",GHS(totalCash)],["BANK",GHS(totalBank)]].map(([l,v]) => (
                        <div key={l} className="px-3 py-2 border-r border-gray-200 last:border-0">
                          <p className="text-gray-400 text-[8px] font-black tracking-widest">{l}</p>
                          <p className="font-black text-[11px] text-[#1d6f42] mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-auto max-h-52">
                      <table className="w-full border-collapse">
                        <thead><tr className="bg-[#1d6f42]">
                          {["#","Branch","Date","Total","Cash","MoMo","Bank","Credit","Profit","Margin"].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left text-[8px] font-black text-white border-r border-white/10 last:border-0 whitespace-nowrap">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {entries.map((e, i) => (
                            <tr key={e.id} className={i%2===0?"bg-white":"bg-[#f0faf5]/60"}>
                              <td className="px-2 py-1.5 text-gray-300 border-r border-gray-100">{i+1}</td>
                              <td className="px-2 py-1.5 font-bold border-r border-gray-100">{e.branch}</td>
                              <td className="px-2 py-1.5 text-gray-500 border-r border-gray-100 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("en-GH",{dateStyle:"short"})}</td>
                              <td className="px-2 py-1.5 font-black border-r border-gray-100">{GHS(e.totalAmount)}</td>
                              <td className="px-2 py-1.5 text-[#059669] border-r border-gray-100">{GHS(e.totalCash)}</td>
                              <td className="px-2 py-1.5 text-[#2563eb] border-r border-gray-100">{GHS(e.totalMomo)}</td>
                              <td className="px-2 py-1.5 text-[#4f46e5] border-r border-gray-100">{GHS(e.totalBank??0)}</td>
                              <td className="px-2 py-1.5 text-[#dc2626] border-r border-gray-100">{GHS(e.totalCredit)}</td>
                              <td className="px-2 py-1.5 text-[#7c3aed] border-r border-gray-100">{GHS(e.totalProfit)}</td>
                              <td className="px-2 py-1.5 text-gray-500">{pct(e.totalProfit,e.totalAmount)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setDone(true); setTimeout(onClose, 2200); }}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white transition-all hover:opacity-90 ${type === "pdf" ? "bg-red-600" : "bg-[#1d6f42]"}`}
                >
                  <Download className="h-4 w-4" />
                  Download {type === "pdf" ? "PDF" : "Excel"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function HistoryPage() {
  const { data: allEntries = [], isLoading } = useListEntries();
  const [period, setPeriod]       = useState<Period>("This Month");
  const [branchFilter, setBranch] = useState("All");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [exportModal, setExportModal]   = useState<"pdf" | "excel" | null>(null);

  const periodFiltered = useMemo(() => filterByPeriod(allEntries, period), [allEntries, period]);
  const filtered = useMemo(() =>
    branchFilter === "All" ? periodFiltered : periodFiltered.filter(e => e.branch === branchFilter),
    [periodFiltered, branchFilter]
  );
  const days = useMemo(() => groupByDay(filtered), [filtered]);
  const sorted = useMemo(() =>
    [...filtered].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filtered]
  );

  const totalSales  = filtered.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = filtered.reduce((s, e) => s + e.totalProfit, 0);
  const totalItems  = filtered.reduce((s, e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  const maxDayTotal = useMemo(() =>
    Math.max(...days.map(d => d.entries.reduce((s,e) => s + e.totalAmount, 0)), 1),
    [days]
  );

  function toggleDay(key: string) {
    setExpandedDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  const now = new Date(); now.setHours(0,0,0,0);

  return (
    <div className="p-6 space-y-5 max-w-3xl" data-testid="page-history">

      {exportModal && (
        <ExportModal
          type={exportModal}
          entries={sorted}
          branchFilter={branchFilter}
          period={period}
          onClose={() => setExportModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">History</h1>
          <p className="text-sm text-muted-foreground">All sales entries grouped by date</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExportModal("pdf")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all">
            <FileText className="h-3.5 w-3.5 text-red-500" /> PDF
          </button>
          <button onClick={() => setExportModal("excel")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all">
            <Table2 className="h-3.5 w-3.5 text-emerald-500" /> Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            {p}
          </button>
        ))}
        <span className="text-border mx-1">|</span>
        {BRANCH_FILTERS.map(b => (
          <button key={b} onClick={() => setBranch(b)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${branchFilter === b ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            {b}
          </button>
        ))}
      </div>

      {/* Summary row */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Entries",    value: String(filtered.length), sub: `${days.length} day${days.length !== 1 ? "s" : ""}`, color: "text-foreground" },
            { label: "Total Sales", value: GHS(totalSales),         sub: `${totalItems} items sold`,                           color: "text-foreground" },
            { label: "Net Profit",  value: GHS(totalProfit),         sub: `${margin}% margin`,                                  color: "text-purple-600" },
            { label: "Margin",      value: `${margin}%`,             sub: GHS(totalProfit),                                     color: margin >= 20 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-red-600" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`mt-1.5 text-xl font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-bold text-muted-foreground">No entries for this period.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Try a wider period or different branch.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {days.map((day, di) => {
            const dayTotal  = day.entries.reduce((s, e) => s + e.totalAmount, 0);
            const dayProfit = day.entries.reduce((s, e) => s + e.totalProfit, 0);
            const dayItems  = day.entries.reduce((s, e) => s + e.itemsSold, 0);
            const dayMargin = pct(dayProfit, dayTotal);
            const isToday   = day.date.getTime() === now.getTime();
            const isYest    = day.date.getTime() === now.getTime() - 86400000;
            const expanded  = expandedDays.has(day.dateStr);

            // vs previous day in the list
            const prevDay   = days[di + 1];
            const prevTotal = prevDay ? prevDay.entries.reduce((s, e) => s + e.totalAmount, 0) : null;
            const dayChange = prevTotal !== null && prevTotal > 0
              ? Math.round(((dayTotal - prevTotal) / prevTotal) * 100) : null;

            const barW = Math.round((dayTotal / maxDayTotal) * 100);
            const dayLabel = isToday ? "Today" : isYest ? "Yesterday" : DAY_LABELS[day.date.getDay()];
            const dateStr  = day.date.toLocaleDateString("en-GH", { month: "short", day: "numeric" });
            const branches = [...new Set(day.entries.map((e: any) => e.branch))];

            return (
              <div key={day.dateStr} className="relative pl-9">
                {/* spine */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                {/* dot */}
                <div className={`absolute left-1 top-5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${isToday ? "bg-primary border-primary" : "bg-card border-border"}`}>
                  {isToday && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                </div>

                <div className={`mb-3 rounded-2xl border bg-card shadow-sm overflow-hidden ${isToday ? "border-primary/40" : "border-border"}`}>
                  {/* Day header */}
                  <button
                    onClick={() => toggleDay(day.dateStr)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-muted/20 transition-colors"
                  >
                    {/* Date */}
                    <div className="shrink-0 w-28">
                      <p className={`text-sm font-black ${isToday ? "text-primary" : "text-foreground"}`}>{dayLabel}</p>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
                    </div>

                    {/* Branch chips */}
                    <div className="flex gap-1 flex-wrap">
                      {(branches as string[]).map((b: string) => {
                        const c = BRANCH_COLORS[b] ?? BRANCH_COLORS["Adenta"];
                        return (
                          <span key={b} className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>{b}</span>
                        );
                      })}
                    </div>

                    {/* Sales bar */}
                    <div className="flex-1 min-w-[80px]">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barW}%`, background: isToday ? "hsl(var(--primary))" : "hsl(var(--primary)/0.65)" }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{dayItems} items · {day.entries.length} entr{day.entries.length !== 1 ? "ies" : "y"}</p>
                    </div>

                    {/* Totals + trend */}
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black text-foreground">{GHS(dayTotal)}</p>
                      {dayChange !== null ? (
                        <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${dayChange > 0 ? "text-emerald-600" : dayChange < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          {dayChange > 0 ? <TrendingUp className="h-3 w-3" /> : dayChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {dayChange > 0 ? "+" : ""}{dayChange}% prev
                        </span>
                      ) : <span className="text-[10px] text-muted-foreground/0">—</span>}
                    </div>

                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                  </button>

                  {/* Expanded: per-entry cards */}
                  {expanded && (
                    <div className="border-t border-border px-5 py-4 bg-muted/10">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {day.entries
                          .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
                          .map((e: any) => {
                            const c = BRANCH_COLORS[e.branch] ?? BRANCH_COLORS["Adenta"];
                            const em = pct(e.totalProfit, e.totalAmount);
                            return (
                              <div key={e.id} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
                                    <span className={`text-xs font-black ${c.text}`}>{e.branch}</span>
                                  </div>
                                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{e.status}</span>
                                </div>

                                <p className="text-xl font-black text-foreground">{GHS(e.totalAmount)}</p>
                                <p className="text-[10px] text-muted-foreground">{e.itemsSold} items · {em}% margin</p>

                                {/* Profit bar */}
                                <div className="mt-2.5">
                                  <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                                    <div className="h-full rounded-full" style={{
                                      width: `${Math.min(100, em * 3)}%`,
                                      background: em >= 20 ? "#059669" : em >= 10 ? "#d97706" : "#dc2626"
                                    }} />
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-[9px] text-muted-foreground">Profit {GHS(e.totalProfit)}</span>
                                    <span className={`text-[9px] font-black ${em >= 20 ? "text-emerald-600" : em >= 10 ? "text-amber-600" : "text-red-600"}`}>{em}%</span>
                                  </div>
                                </div>

                                <p className="text-[9px] text-muted-foreground/50 mt-2">
                                  {new Date(e.createdAt).toLocaleTimeString("en-GH",{hour:"2-digit",minute:"2-digit"})}
                                  {e.totalCredit > 0 && e.creditCustomer ? ` · Credit: ${e.creditCustomer}` : ""}
                                </p>
                              </div>
                            );
                          })}
                      </div>

                      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-bold">{dateStr} total</span>
                        <div className="flex gap-4">
                          <span className="text-xs font-bold text-purple-600">Profit {GHS(dayProfit)}</span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${dayMargin >= 20 ? "bg-emerald-100 text-emerald-700" : dayMargin >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{dayMargin}%</span>
                          <span className="text-xs font-black text-foreground">{GHS(dayTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
