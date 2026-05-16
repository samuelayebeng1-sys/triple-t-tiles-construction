import { useState, useMemo } from "react";
import { useListEntries } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { History, FileText, Table2, ChevronDown, ChevronUp, X } from "lucide-react";

const PERIODS = ["Today", "This Week", "This Month", "All Time"] as const;
type Period = typeof PERIODS[number];
const BRANCH_FILTERS = ["All", ...BRANCHES] as const;

function filterByPeriod(entries: any[], period: Period) {
  const now = new Date();
  return entries.filter(e => {
    const d = new Date(e.createdAt);
    if (period === "Today") {
      return d.toDateString() === now.toDateString();
    }
    if (period === "This Week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (period === "This Month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function PdfModal({ entries, branchFilter, period, onClose }: { entries: any[]; branchFilter: string; period: string; onClose: () => void }) {
  const companyName = localStorage.getItem("bc_company") || "BranchControl";
  const today = new Date().toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });
  const totalSales  = entries.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = entries.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = entries.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = entries.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = entries.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-black text-foreground">PDF Preview — History</p>
              <p className="text-xs text-muted-foreground">{branchFilter === "All" ? "All Branches" : branchFilter} · {period} · {entries.length} entries</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted transition-all"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">
          <div className="bg-white text-[#111] rounded-xl border border-gray-200 shadow-inner overflow-hidden text-[11px]">
            <div className="bg-[#0f172a] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-black text-sm">{companyName}</p>
                <p className="text-white/50 text-[10px] mt-0.5">Sales History · {period} · {branchFilter === "All" ? "All Branches" : branchFilter}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-[10px]">{today}</p>
                <p className="text-white/50 text-[10px]">{entries.length} records</p>
              </div>
            </div>
            <div className="grid grid-cols-6 border-b border-gray-100">
              {[
                { label: "Total Sales",  value: GHS(totalSales),  color: "#111" },
                { label: "Net Profit",   value: GHS(totalProfit), color: "#059669" },
                { label: "Cash",         value: GHS(totalCash),   color: "#2563eb" },
                { label: "MoMo",         value: GHS(totalMomo),   color: "#0ea5e9" },
                { label: "Bank",         value: GHS(totalBank),   color: "#4f46e5" },
                { label: "Credit",       value: GHS(totalCredit), color: "#dc2626" },
              ].map(({ label, value, color }) => (
                <div key={label} className="px-3 py-2.5 border-r border-gray-100 last:border-r-0">
                  <p className="text-gray-400 text-[8px] uppercase tracking-widest font-bold">{label}</p>
                  <p className="font-black text-[11px] mt-0.5" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="overflow-auto max-h-64">
              {entries.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No entries for this period.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Branch", "Date", "Total", "Cash", "MoMo", "Bank", "Credit", "Profit", "Items"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[8px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-3 py-1.5 font-bold">{e.branch}</td>
                        <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("en-GH", { dateStyle: "short" })}</td>
                        <td className="px-3 py-1.5 font-black">{GHS(e.totalAmount)}</td>
                        <td className="px-3 py-1.5 text-[#059669]">{GHS(e.totalCash)}</td>
                        <td className="px-3 py-1.5 text-[#2563eb]">{GHS(e.totalMomo)}</td>
                        <td className="px-3 py-1.5 text-[#4f46e5]">{GHS(e.totalBank ?? 0)}</td>
                        <td className="px-3 py-1.5 text-[#dc2626]">{GHS(e.totalCredit)}</td>
                        <td className="px-3 py-1.5 text-[#7c3aed]">{GHS(e.totalProfit)}</td>
                        <td className="px-3 py-1.5 text-gray-500">{e.itemsSold}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t border-gray-200 font-black">
                      <td className="px-3 py-2 text-gray-700" colSpan={2}>TOTAL ({entries.length})</td>
                      <td className="px-3 py-2">{GHS(totalSales)}</td>
                      <td className="px-3 py-2 text-[#059669]">{GHS(totalCash)}</td>
                      <td className="px-3 py-2 text-[#2563eb]">{GHS(totalMomo)}</td>
                      <td className="px-3 py-2 text-[#4f46e5]">{GHS(totalBank)}</td>
                      <td className="px-3 py-2 text-[#dc2626]">{GHS(totalCredit)}</td>
                      <td className="px-3 py-2 text-[#7c3aed]">{GHS(totalProfit)}</td>
                      <td className="px-3 py-2 text-gray-500">{entries.reduce((s,e)=>s+e.itemsSold,0)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
            <div className="px-5 py-2 border-t border-gray-100 bg-gray-50 flex justify-between">
              <p className="text-gray-300 text-[8px]">Generated by BranchControl · ChalePay</p>
              <p className="text-gray-300 text-[8px]">{entries.length} records · margin {pct(totalProfit, totalSales)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExcelModal({ entries, branchFilter, period, onClose }: { entries: any[]; branchFilter: string; period: string; onClose: () => void }) {
  const cols = ["Branch", "Date", "Status", "Total", "Cash", "MoMo", "Bank", "Credit", "Profit", "Margin%", "Items"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Table2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-black text-foreground">Excel Preview — History</p>
              <p className="text-xs text-muted-foreground">{branchFilter === "All" ? "All Branches" : branchFilter} · {period} · {entries.length} entries</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted transition-all"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">
          <div className="rounded-xl border border-gray-200 overflow-hidden text-[10px] bg-white">
            <div className="bg-[#1d6f42] px-4 py-2 flex items-center gap-2">
              <Table2 className="h-3.5 w-3.5 text-white/80" />
              <span className="text-white font-bold text-[11px]">BranchControl_History_{period.replace(/\s+/g,"_")}.xlsx</span>
            </div>
            <div className="flex bg-gray-100 border-b border-gray-200 px-2 pt-1.5 gap-1">
              <div className="bg-white border border-gray-200 border-b-0 rounded-t px-3 py-1 text-[10px] font-black text-[#1d6f42]">History</div>
              <div className="bg-gray-50 border border-gray-200 border-b-0 rounded-t px-3 py-1 text-[10px] text-gray-400">Summary</div>
            </div>
            <div className="grid grid-cols-4 border-b border-gray-200 bg-[#e8f4f0]/60">
              {[
                { label: "TOTAL",  value: GHS(entries.reduce((s,e)=>s+e.totalAmount,0)) },
                { label: "PROFIT", value: GHS(entries.reduce((s,e)=>s+e.totalProfit,0)) },
                { label: "CASH",   value: GHS(entries.reduce((s,e)=>s+e.totalCash,0)) },
                { label: "BANK",   value: GHS(entries.reduce((s,e)=>s+(e.totalBank??0),0)) },
              ].map(({ label, value }) => (
                <div key={label} className="px-3 py-2 border-r border-gray-200 last:border-r-0">
                  <p className="text-gray-400 text-[8px] font-black tracking-widest">{label}</p>
                  <p className="font-black text-[11px] text-[#1d6f42] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <div className="overflow-auto max-h-64">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#1d6f42]">
                    <th className="w-7 px-2 py-1.5 text-white/60 text-[8px] font-normal border-r border-white/10">#</th>
                    {cols.map(c => (
                      <th key={c} className="px-2 py-1.5 text-left text-[8px] font-black text-white border-r border-white/10 last:border-r-0 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={cols.length+1} className="text-center text-gray-400 py-5">No data</td></tr>
                  ) : entries.map((e, i) => (
                    <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-[#f0faf5]/60"}>
                      <td className="px-2 py-1.5 text-gray-300 text-center border-r border-gray-100">{i+1}</td>
                      <td className="px-2 py-1.5 font-bold border-r border-gray-100">{e.branch}</td>
                      <td className="px-2 py-1.5 text-gray-500 border-r border-gray-100 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("en-GH",{dateStyle:"short"})}</td>
                      <td className="px-2 py-1.5 border-r border-gray-100"><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold text-[8px]">{e.status}</span></td>
                      <td className="px-2 py-1.5 font-black border-r border-gray-100">{GHS(e.totalAmount)}</td>
                      <td className="px-2 py-1.5 text-[#059669] font-bold border-r border-gray-100">{GHS(e.totalCash)}</td>
                      <td className="px-2 py-1.5 text-[#2563eb] font-bold border-r border-gray-100">{GHS(e.totalMomo)}</td>
                      <td className="px-2 py-1.5 text-[#4f46e5] font-bold border-r border-gray-100">{GHS(e.totalBank??0)}</td>
                      <td className="px-2 py-1.5 text-[#dc2626] font-bold border-r border-gray-100">{GHS(e.totalCredit)}</td>
                      <td className="px-2 py-1.5 text-[#7c3aed] font-bold border-r border-gray-100">{GHS(e.totalProfit)}</td>
                      <td className="px-2 py-1.5 text-gray-500 border-r border-gray-100">{pct(e.totalProfit,e.totalAmount)}%</td>
                      <td className="px-2 py-1.5 text-gray-500">{e.itemsSold}</td>
                    </tr>
                  ))}
                  {entries.length > 0 && (
                    <tr className="bg-[#1d6f42]/5 border-t-2 border-[#1d6f42]/20 font-black">
                      <td className="px-2 py-1.5 border-r border-gray-100"/>
                      <td className="px-2 py-1.5 border-r border-gray-100 text-[#1d6f42]" colSpan={3}>TOTAL</td>
                      <td className="px-2 py-1.5 border-r border-gray-100">{GHS(entries.reduce((s,e)=>s+e.totalAmount,0))}</td>
                      <td className="px-2 py-1.5 border-r border-gray-100 text-[#059669]">{GHS(entries.reduce((s,e)=>s+e.totalCash,0))}</td>
                      <td className="px-2 py-1.5 border-r border-gray-100 text-[#2563eb]">{GHS(entries.reduce((s,e)=>s+e.totalMomo,0))}</td>
                      <td className="px-2 py-1.5 border-r border-gray-100 text-[#4f46e5]">{GHS(entries.reduce((s,e)=>s+(e.totalBank??0),0))}</td>
                      <td className="px-2 py-1.5 border-r border-gray-100 text-[#dc2626]">{GHS(entries.reduce((s,e)=>s+e.totalCredit,0))}</td>
                      <td className="px-2 py-1.5 border-r border-gray-100 text-[#7c3aed]">{GHS(entries.reduce((s,e)=>s+e.totalProfit,0))}</td>
                      <td className="px-2 py-1.5 border-r border-gray-100 text-gray-400">{pct(entries.reduce((s,e)=>s+e.totalProfit,0),entries.reduce((s,e)=>s+e.totalAmount,0))}%</td>
                      <td className="px-2 py-1.5 text-gray-500">{entries.reduce((s,e)=>s+e.itemsSold,0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { data: allEntries = [], isLoading } = useListEntries();
  const [period, setPeriod] = useState<Period>("This Month");
  const [branchFilter, setBranchFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportModal, setExportModal] = useState<"pdf" | "excel" | null>(null);

  const periodFiltered = useMemo(() => filterByPeriod(allEntries, period), [allEntries, period]);
  const filtered = useMemo(() =>
    branchFilter === "All" ? periodFiltered : periodFiltered.filter(e => e.branch === branchFilter),
    [periodFiltered, branchFilter]
  );
  const sorted = useMemo(() => [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [filtered]);

  const totalSales  = filtered.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = filtered.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = filtered.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = filtered.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = filtered.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems  = filtered.reduce((s, e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  return (
    <div className="p-6 space-y-6 max-w-6xl" data-testid="page-history">

      {exportModal === "pdf" && (
        <PdfModal entries={sorted} branchFilter={branchFilter} period={period} onClose={() => setExportModal(null)} />
      )}
      {exportModal === "excel" && (
        <ExcelModal entries={sorted} branchFilter={branchFilter} period={period} onClose={() => setExportModal(null)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <History className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">History</h1>
              <p className="text-sm text-muted-foreground">All locked daily entries with detailed breakdown</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setExportModal("pdf")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all">
            <FileText className="h-3.5 w-3.5 text-red-500" /> Export PDF
          </button>
          <button onClick={() => setExportModal("excel")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all">
            <Table2 className="h-3.5 w-3.5 text-emerald-500" /> Excel
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Period</span>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            {p}
          </button>
        ))}
        <span className="mx-2 text-border">|</span>
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Branch</span>
        {BRANCH_FILTERS.map(b => (
          <button key={b} onClick={() => setBranchFilter(b)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${branchFilter === b ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            {b}
          </button>
        ))}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Entries",      value: String(filtered.length), color: "text-foreground",    sub: `${totalItems} items` },
          { label: "Total Sales",  value: GHS(totalSales),         color: "text-foreground",    sub: `${margin}% margin` },
          { label: "Net Profit",   value: GHS(totalProfit),        color: "text-purple-600",    sub: `${margin}% margin` },
          { label: "Cash",         value: GHS(totalCash),          color: "text-emerald-600",   sub: totalSales > 0 ? `${pct(totalCash, totalSales)}% of sales` : "—" },
          { label: "MoMo",         value: GHS(totalMomo),          color: "text-blue-600",      sub: totalSales > 0 ? `${pct(totalMomo, totalSales)}% of sales` : "—" },
          { label: "Bank",         value: GHS(totalBank),          color: "text-indigo-600",    sub: totalSales > 0 ? `${pct(totalBank, totalSales)}% of sales` : "—" },
          { label: "Credit",       value: GHS(totalCredit),        color: "text-red-600",       sub: totalSales > 0 ? `${pct(totalCredit, totalSales)}% of sales` : "—" },
          { label: "Margin",       value: `${margin}%`,            color: "text-amber-600",     sub: GHS(totalProfit) },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={`mt-1.5 text-lg font-black leading-tight ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Entries table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-bold text-muted-foreground">No entries for this period.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try selecting a wider period or different branch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["", "Branch", "Date & Time", "Total Sale", "Cash", "MoMo", "Bank", "Credit", "Profit", "Margin", "Items", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((e, i) => {
                  const expanded = expandedId === e.id;
                  const cashShare   = pct(e.totalCash, e.totalAmount);
                  const momoShare   = pct(e.totalMomo, e.totalAmount);
                  const bankShare   = pct(e.totalBank ?? 0, e.totalAmount);
                  const creditShare = pct(e.totalCredit, e.totalAmount);
                  const margin      = pct(e.totalProfit, e.totalAmount);
                  return (
                    <>
                      <tr
                        key={e.id}
                        onClick={() => setExpandedId(expanded ? null : e.id)}
                        className={`border-b border-border/50 cursor-pointer transition-colors ${expanded ? "bg-primary/5" : i % 2 === 0 ? "hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}`}
                      >
                        <td className="px-4 py-3">
                          {expanded
                            ? <ChevronUp className="h-4 w-4 text-primary" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground/40" />}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-black text-foreground">{e.branch}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-bold text-foreground">{new Date(e.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}</p>
                        </td>
                        <td className="px-4 py-3 font-black text-foreground whitespace-nowrap">{GHS(e.totalAmount)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold whitespace-nowrap">{e.totalCash > 0 ? GHS(e.totalCash) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 text-blue-600 font-bold whitespace-nowrap">{e.totalMomo > 0 ? GHS(e.totalMomo) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 text-indigo-600 font-bold whitespace-nowrap">{(e.totalBank ?? 0) > 0 ? GHS(e.totalBank ?? 0) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 text-red-600 font-bold whitespace-nowrap">{e.totalCredit > 0 ? GHS(e.totalCredit) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 text-purple-600 font-bold whitespace-nowrap">{GHS(e.totalProfit)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${margin >= 20 ? "bg-emerald-100 text-emerald-700" : margin >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-bold">{e.itemsSold}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{e.status}</span>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expanded && (
                        <tr key={`${e.id}-detail`} className="border-b border-border bg-primary/5">
                          <td colSpan={12} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

                              {/* Payment breakdown bar */}
                              <div className="md:col-span-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Payment Method Breakdown</p>
                                <div className="flex rounded-full overflow-hidden h-3 bg-muted w-full">
                                  {cashShare > 0   && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${cashShare}%` }} title={`Cash ${cashShare}%`} />}
                                  {momoShare > 0   && <div className="bg-blue-500 h-full transition-all"    style={{ width: `${momoShare}%` }} title={`MoMo ${momoShare}%`} />}
                                  {bankShare > 0   && <div className="bg-indigo-500 h-full transition-all"  style={{ width: `${bankShare}%` }} title={`Bank ${bankShare}%`} />}
                                  {creditShare > 0 && <div className="bg-red-500 h-full transition-all"     style={{ width: `${creditShare}%` }} title={`Credit ${creditShare}%`} />}
                                </div>
                                <div className="flex gap-4 mt-1.5 flex-wrap">
                                  {cashShare > 0   && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"/>Cash {cashShare}%</span>}
                                  {momoShare > 0   && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block"/>MoMo {momoShare}%</span>}
                                  {bankShare > 0   && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500 inline-block"/>Bank {bankShare}%</span>}
                                  {creditShare > 0 && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block"/>Credit {creditShare}%</span>}
                                </div>
                              </div>

                              {/* Detail cards */}
                              {[
                                { label: "Cash Collected",   value: GHS(e.totalCash),         color: "text-emerald-600",  bg: "bg-emerald-50 dark:bg-emerald-950/20",  border: "border-emerald-200 dark:border-emerald-800" },
                                { label: "MoMo Collected",   value: GHS(e.totalMomo),         color: "text-blue-600",     bg: "bg-blue-50 dark:bg-blue-950/20",         border: "border-blue-200 dark:border-blue-800" },
                                { label: "Bank Transfer",    value: GHS(e.totalBank ?? 0),     color: "text-indigo-600",   bg: "bg-indigo-50 dark:bg-indigo-950/20",     border: "border-indigo-200 dark:border-indigo-800" },
                                { label: "Credit Given",     value: GHS(e.totalCredit),        color: "text-red-600",      bg: "bg-red-50 dark:bg-red-950/20",           border: "border-red-200 dark:border-red-800" },
                                { label: "Gross Sales",      value: GHS(e.totalAmount),        color: "text-foreground",   bg: "bg-muted/50",                            border: "border-border" },
                                { label: "Net Profit",       value: GHS(e.totalProfit),        color: "text-purple-600",   bg: "bg-purple-50 dark:bg-purple-950/20",     border: "border-purple-200 dark:border-purple-800" },
                                { label: "Profit Margin",    value: `${margin}%`,              color: "text-amber-600",    bg: "bg-amber-50 dark:bg-amber-950/20",       border: "border-amber-200 dark:border-amber-800" },
                                { label: "Items Sold",       value: String(e.itemsSold),       color: "text-foreground",   bg: "bg-muted/50",                            border: "border-border" },
                              ].map(({ label, value, color, bg, border }) => (
                                <div key={label} className={`rounded-xl border ${border} ${bg} px-4 py-3`}>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                                  <p className={`text-lg font-black mt-1 ${color}`}>{value}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-primary/5">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground" colSpan={2}>
                    Totals · {sorted.length} entr{sorted.length === 1 ? "y" : "ies"}
                  </td>
                  <td className="px-4 py-3 font-black text-foreground whitespace-nowrap">{GHS(totalSales)}</td>
                  <td className="px-4 py-3 text-emerald-600 font-black whitespace-nowrap">{GHS(totalCash)}</td>
                  <td className="px-4 py-3 text-blue-600 font-black whitespace-nowrap">{GHS(totalMomo)}</td>
                  <td className="px-4 py-3 text-indigo-600 font-black whitespace-nowrap">{GHS(totalBank)}</td>
                  <td className="px-4 py-3 text-red-600 font-black whitespace-nowrap">{GHS(totalCredit)}</td>
                  <td className="px-4 py-3 text-purple-600 font-black whitespace-nowrap">{GHS(totalProfit)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{margin}%</span>
                  </td>
                  <td className="px-4 py-3 font-black text-foreground">{totalItems}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
