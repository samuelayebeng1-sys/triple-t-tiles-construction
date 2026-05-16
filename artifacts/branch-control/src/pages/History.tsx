import { useState, useMemo } from "react";
import { useListEntries } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History, FileText, Table2, ChevronDown, ChevronUp, X,
  TrendingUp, TrendingDown, Minus, BarChart3, Building2
} from "lucide-react";

const PERIODS = ["Today", "This Week", "This Month", "All Time"] as const;
type Period = typeof PERIODS[number];
const BRANCH_FILTERS = ["All", ...BRANCHES] as const;

const BRANCH_COLORS: Record<string, { bg: string; text: string; bar: string; border: string }> = {
  Adenta:  { bg: "bg-blue-50 dark:bg-blue-950/20",   text: "text-blue-700",   bar: "#3b82f6", border: "border-blue-200 dark:border-blue-800" },
  Spintex: { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-700", bar: "#7c3aed", border: "border-purple-200 dark:border-purple-800" },
  Kasoa:   { bg: "bg-amber-50 dark:bg-amber-950/20",  text: "text-amber-700",  bar: "#d97706", border: "border-amber-200 dark:border-amber-800" },
};

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

/* ── Daily activity chart ─────────────────────────────── */
function DailyChart({ entries, period }: { entries: any[]; period: Period }) {
  const days = useMemo(() => {
    const map = new Map<string, { sales: number; profit: number; count: number; label: string }>();
    const now = new Date();

    let slots: string[] = [];
    if (period === "Today") {
      // Hours 0–23
      for (let h = 0; h < 24; h++) {
        const key = String(h).padStart(2, "0");
        map.set(key, { sales: 0, profit: 0, count: 0, label: `${key}:00` });
        slots.push(key);
      }
      entries.forEach(e => {
        const h = String(new Date(e.createdAt).getHours()).padStart(2, "0");
        const d = map.get(h)!;
        d.sales += e.totalAmount; d.profit += e.totalProfit; d.count++;
      });
    } else {
      // Last N days
      const n = period === "This Week" ? 7 : period === "This Month" ? 31 : 14;
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
        const key = d.toDateString();
        const label = d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
        map.set(key, { sales: 0, profit: 0, count: 0, label });
        slots.push(key);
      }
      entries.forEach(e => {
        const d = new Date(e.createdAt); d.setHours(0,0,0,0);
        const key = d.toDateString();
        if (map.has(key)) {
          const rec = map.get(key)!;
          rec.sales += e.totalAmount; rec.profit += e.totalProfit; rec.count++;
        }
      });
    }

    return slots.map(k => map.get(k)!);
  }, [entries, period]);

  const maxSales = Math.max(...days.map(d => d.sales), 1);
  const activeDays = days.filter(d => d.count > 0);
  if (activeDays.length === 0) return null;

  // For "All Time" with many slots, only show last 14
  const visible = period === "All Time" ? days.slice(-14) : days;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-black text-foreground">Daily Activity</p>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{period}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm inline-block" style={{background:"hsl(var(--primary))"}}/> Sales</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm inline-block bg-purple-400"/>Profit</span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-24 overflow-x-auto pb-1">
        {visible.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[20px] group relative">
            <div className="w-full flex flex-col items-center justify-end gap-0.5 h-16 relative">
              {/* Profit bar (back) */}
              {d.profit > 0 && (
                <div
                  className="w-[40%] rounded-t-sm absolute bottom-0 left-1/2 -translate-x-[70%] opacity-60"
                  style={{ height: `${(d.profit / maxSales) * 64}px`, background: "#a78bfa" }}
                />
              )}
              {/* Sales bar (front) */}
              <div
                className="w-[55%] rounded-t-sm absolute bottom-0 left-1/2 -translate-x-[30%] transition-all"
                style={{
                  height: `${Math.max((d.sales / maxSales) * 64, d.count > 0 ? 3 : 0)}px`,
                  background: d.count > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  opacity: d.count > 0 ? 1 : 0.3,
                }}
              />
              {/* Tooltip */}
              {d.count > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-2 py-1.5 text-[9px] whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <p className="font-black text-foreground">{d.label}</p>
                  <p className="text-emerald-600">{GHS(d.sales)}</p>
                  <p className="text-purple-500">Profit {GHS(d.profit)}</p>
                  <p className="text-muted-foreground">{d.count} entr{d.count === 1 ? "y" : "ies"}</p>
                </div>
              )}
            </div>
            <p className="text-[8px] text-muted-foreground/50 font-bold rotate-[-35deg] origin-top-left translate-y-1 truncate max-w-[28px]">
              {d.label.split(" ")[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Branch breakdown ─────────────────────────────────── */
function BranchBreakdown({ entries, totalSales }: { entries: any[]; totalSales: number }) {
  const stats = useMemo(() =>
    BRANCHES.map(branch => {
      const be = entries.filter(e => e.branch === branch);
      const sales  = be.reduce((s, e) => s + e.totalAmount, 0);
      const profit = be.reduce((s, e) => s + e.totalProfit, 0);
      const cash   = be.reduce((s, e) => s + e.totalCash, 0);
      const momo   = be.reduce((s, e) => s + e.totalMomo, 0);
      const bank   = be.reduce((s, e) => s + (e.totalBank ?? 0), 0);
      const credit = be.reduce((s, e) => s + e.totalCredit, 0);
      const items  = be.reduce((s, e) => s + e.itemsSold, 0);
      return { branch, entries: be.length, sales, profit, cash, momo, bank, credit, items };
    }),
  [entries]);

  if (stats.every(s => s.entries === 0)) return null;
  const maxSales = Math.max(...stats.map(s => s.sales), 1);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {stats.map(s => {
        const c = BRANCH_COLORS[s.branch] ?? BRANCH_COLORS["Adenta"];
        const shareOfTotal = pct(s.sales, totalSales);
        const margin       = pct(s.profit, s.sales);
        const barW         = s.sales > 0 ? Math.round((s.sales / maxSales) * 100) : 0;
        const cashPct   = pct(s.cash,   s.sales);
        const momoPct   = pct(s.momo,   s.sales);
        const bankPct   = pct(s.bank,   s.sales);
        const creditPct = pct(s.credit, s.sales);
        return (
          <div key={s.branch} className={`rounded-2xl border ${c.border} ${c.bg} p-5 space-y-4`}>
            {/* Branch header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: c.bar + "22" }}>
                  <Building2 className="h-4 w-4" style={{ color: c.bar }} />
                </div>
                <div>
                  <p className={`font-black text-sm ${c.text}`}>{s.branch}</p>
                  <p className="text-[10px] text-muted-foreground">{s.entries} entr{s.entries === 1 ? "y" : "ies"} · {s.items} items</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black text-base ${c.text}`}>{GHS(s.sales)}</p>
                <p className="text-[10px] text-muted-foreground">{shareOfTotal}% of total</p>
              </div>
            </div>

            {/* Share-of-total bar */}
            <div>
              <div className="flex justify-between text-[9px] font-bold text-muted-foreground mb-1">
                <span>Share of period sales</span><span>{shareOfTotal}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: c.bar }} />
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Net Profit</p>
                <p className="text-sm font-black text-purple-600">{GHS(s.profit)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Margin</p>
                <p className={`text-sm font-black ${margin >= 20 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-red-600"}`}>{margin}%</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cash</p>
                <p className="text-sm font-black text-emerald-600">{GHS(s.cash)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Credit Out</p>
                <p className="text-sm font-black text-red-600">{GHS(s.credit)}</p>
              </div>
            </div>

            {/* Payment mix mini-bar */}
            {s.sales > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Payment mix</p>
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
                  {cashPct   > 0 && <div className="h-full bg-emerald-500" style={{ width: `${cashPct}%` }} title={`Cash ${cashPct}%`} />}
                  {momoPct   > 0 && <div className="h-full bg-blue-500"    style={{ width: `${momoPct}%` }} title={`MoMo ${momoPct}%`} />}
                  {bankPct   > 0 && <div className="h-full bg-indigo-500"  style={{ width: `${bankPct}%` }} title={`Bank ${bankPct}%`} />}
                  {creditPct > 0 && <div className="h-full bg-red-500"     style={{ width: `${creditPct}%` }} title={`Credit ${creditPct}%`} />}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                  {[
                    { label: "Cash",   val: cashPct,   color: "bg-emerald-500" },
                    { label: "MoMo",   val: momoPct,   color: "bg-blue-500" },
                    { label: "Bank",   val: bankPct,   color: "bg-indigo-500" },
                    { label: "Credit", val: creditPct, color: "bg-red-500" },
                  ].filter(x => x.val > 0).map(x => (
                    <span key={x.label} className="text-[9px] font-bold text-muted-foreground flex items-center gap-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${x.color} inline-block`}/>{x.label} {x.val}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Averages bar ─────────────────────────────────────── */
function AveragesBar({ entries, totalSales, totalProfit, totalItems, period }: {
  entries: any[]; totalSales: number; totalProfit: number; totalItems: number; period: Period;
}) {
  if (entries.length === 0) return null;

  const avgSale   = entries.length > 0 ? Math.round(totalSales / entries.length) : 0;
  const avgProfit = entries.length > 0 ? Math.round(totalProfit / entries.length) : 0;
  const avgItems  = entries.length > 0 ? Math.round(totalItems / entries.length) : 0;

  // Best single entry
  const best = entries.reduce((a, b) => b.totalAmount > a.totalAmount ? b : a, entries[0]);

  // Unique days
  const uniqueDays = new Set(entries.map(e => new Date(e.createdAt).toDateString())).size;
  const avgPerDay  = uniqueDays > 0 ? Math.round(totalSales / uniqueDays) : 0;

  // Top branch
  const byBranch = BRANCHES.map(b => ({
    branch: b,
    sales: entries.filter(e => e.branch === b).reduce((s, e) => s + e.totalAmount, 0),
  }));
  const topBranch = byBranch.reduce((a, b) => b.sales > a.sales ? b : a, byBranch[0]);

  // Period label for "per day"
  const dayLabel = period === "Today" ? "per hour avg" : "avg per day";

  const stats = [
    { label: "Avg per Entry",    value: GHS(avgSale),    sub: `${entries.length} entries` },
    { label: "Avg Profit/Entry", value: GHS(avgProfit),  sub: `${pct(totalProfit, totalSales)}% margin` },
    { label: "Avg Items/Entry",  value: String(avgItems), sub: "items sold avg" },
    { label: dayLabel,           value: GHS(avgPerDay),  sub: `${uniqueDays} active day${uniqueDays === 1 ? "" : "s"}` },
    { label: "Best Single Entry",value: GHS(best.totalAmount), sub: `${best.branch} · ${new Date(best.createdAt).toLocaleDateString("en-GH", { dateStyle: "short" })}` },
    { label: "Top Branch",       value: topBranch.branch, sub: GHS(topBranch.sales) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-black text-foreground">Averages & Highlights</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="px-5 py-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-1 text-base font-black text-foreground leading-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Export modals (unchanged) ────────────────────────── */
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
                { label: "Total Sales", value: GHS(totalSales),  color: "#111" },
                { label: "Net Profit",  value: GHS(totalProfit), color: "#059669" },
                { label: "Cash",        value: GHS(totalCash),   color: "#2563eb" },
                { label: "MoMo",        value: GHS(totalMomo),   color: "#0ea5e9" },
                { label: "Bank",        value: GHS(totalBank),   color: "#4f46e5" },
                { label: "Credit",      value: GHS(totalCredit), color: "#dc2626" },
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

/* ── Main page ────────────────────────────────────────── */
export default function HistoryPage() {
  const { data: allEntries = [], isLoading } = useListEntries();
  const [period, setPeriod]         = useState<Period>("This Month");
  const [branchFilter, setBranchFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportModal, setExportModal] = useState<"pdf" | "excel" | null>(null);

  const periodFiltered = useMemo(() => filterByPeriod(allEntries, period), [allEntries, period]);
  const filtered = useMemo(() =>
    branchFilter === "All" ? periodFiltered : periodFiltered.filter(e => e.branch === branchFilter),
    [periodFiltered, branchFilter]
  );
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filtered]
  );

  const totalSales  = filtered.reduce((s, e) => s + e.totalAmount, 0);
  const totalProfit = filtered.reduce((s, e) => s + e.totalProfit, 0);
  const totalCash   = filtered.reduce((s, e) => s + e.totalCash, 0);
  const totalMomo   = filtered.reduce((s, e) => s + e.totalMomo, 0);
  const totalBank   = filtered.reduce((s, e) => s + (e.totalBank ?? 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + e.totalCredit, 0);
  const totalItems  = filtered.reduce((s, e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  // For branch breakdown we always use period-filtered (not branch-filtered)
  const allBranchEntries = periodFiltered;

  return (
    <div className="p-6 space-y-5 max-w-6xl" data-testid="page-history">

      {exportModal === "pdf" && (
        <PdfModal entries={sorted} branchFilter={branchFilter} period={period} onClose={() => setExportModal(null)} />
      )}
      {exportModal === "excel" && (
        <ExcelModal entries={sorted} branchFilter={branchFilter} period={period} onClose={() => setExportModal(null)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <History className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">History</h1>
            <p className="text-sm text-muted-foreground">All locked daily entries — breakdown, trends &amp; branch comparison</p>
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

      {/* Filters */}
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

      {/* Summary tiles (8) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Entries",     value: String(filtered.length), color: "text-foreground",  sub: `${totalItems} items` },
          { label: "Total Sales", value: GHS(totalSales),          color: "text-foreground",  sub: `${margin}% margin` },
          { label: "Net Profit",  value: GHS(totalProfit),         color: "text-purple-600",  sub: `${margin}% margin` },
          { label: "Cash",        value: GHS(totalCash),           color: "text-emerald-600", sub: totalSales > 0 ? `${pct(totalCash,   totalSales)}% of sales` : "—" },
          { label: "MoMo",        value: GHS(totalMomo),           color: "text-blue-600",    sub: totalSales > 0 ? `${pct(totalMomo,   totalSales)}% of sales` : "—" },
          { label: "Bank",        value: GHS(totalBank),           color: "text-indigo-600",  sub: totalSales > 0 ? `${pct(totalBank,   totalSales)}% of sales` : "—" },
          { label: "Credit",      value: GHS(totalCredit),         color: "text-red-600",     sub: totalSales > 0 ? `${pct(totalCredit, totalSales)}% of sales` : "—" },
          { label: "Margin",      value: `${margin}%`,             color: "text-amber-600",   sub: GHS(totalProfit) },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={`mt-1.5 text-lg font-black leading-tight ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Averages & highlights */}
      {!isLoading && (
        <AveragesBar
          entries={filtered}
          totalSales={totalSales}
          totalProfit={totalProfit}
          totalItems={totalItems}
          period={period}
        />
      )}

      {/* Daily activity chart */}
      {!isLoading && (
        <DailyChart entries={filtered} period={period} />
      )}

      {/* Branch breakdown (always shows all-branch view regardless of filter) */}
      {!isLoading && branchFilter === "All" && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Branch Breakdown — {period}</p>
          <BranchBreakdown entries={allBranchEntries} totalSales={allBranchEntries.reduce((s,e) => s + e.totalAmount, 0)} />
        </div>
      )}

      {/* Entries table */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
          Entry Log{branchFilter !== "All" ? ` — ${branchFilter}` : ""} · {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </p>
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
                    const expanded    = expandedId === e.id;
                    const cashShare   = pct(e.totalCash,        e.totalAmount);
                    const momoShare   = pct(e.totalMomo,        e.totalAmount);
                    const bankShare   = pct(e.totalBank ?? 0,   e.totalAmount);
                    const creditShare = pct(e.totalCredit,      e.totalAmount);
                    const entryMargin = pct(e.totalProfit,      e.totalAmount);
                    const bc          = BRANCH_COLORS[e.branch] ?? BRANCH_COLORS["Adenta"];
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
                            <span className={`inline-flex items-center gap-1.5 font-black text-sm ${bc.text}`}>
                              <span className="h-2 w-2 rounded-full inline-block" style={{ background: bc.bar }} />
                              {e.branch}
                            </span>
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
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${entryMargin >= 20 ? "bg-emerald-100 text-emerald-700" : entryMargin >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              {entryMargin}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-bold">{e.itemsSold}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{e.status}</span>
                          </td>
                        </tr>

                        {/* ── Expanded row ── */}
                        {expanded && (
                          <tr key={`${e.id}-detail`} className="border-b border-border bg-primary/5">
                            <td colSpan={12} className="px-6 py-5">
                              <div className="space-y-4">

                                {/* Entry meta row */}
                                <div className="flex flex-wrap items-center gap-4">
                                  <div className={`inline-flex items-center gap-2 rounded-xl border ${bc.border} ${bc.bg} px-3 py-1.5`}>
                                    <span className="h-2 w-2 rounded-full inline-block" style={{ background: bc.bar }} />
                                    <span className={`text-xs font-black ${bc.text}`}>{e.branch}</span>
                                  </div>
                                  <span className="text-xs font-bold text-muted-foreground">
                                    Entry #{e.id} &nbsp;·&nbsp; {new Date(e.createdAt).toLocaleDateString("en-GH", { dateStyle: "full" })} &nbsp;·&nbsp; {new Date(e.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{e.status}</span>
                                  {e.totalCredit > 0 && e.creditCustomer && (
                                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                      Credit: {e.creditCustomer}
                                    </span>
                                  )}
                                </div>

                                {/* Payment mix bar */}
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Payment breakdown</p>
                                  <div className="flex rounded-full overflow-hidden h-3 bg-muted w-full">
                                    {cashShare   > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${cashShare}%` }} />}
                                    {momoShare   > 0 && <div className="bg-blue-500 h-full"    style={{ width: `${momoShare}%` }} />}
                                    {bankShare   > 0 && <div className="bg-indigo-500 h-full"  style={{ width: `${bankShare}%` }} />}
                                    {creditShare > 0 && <div className="bg-red-500 h-full"     style={{ width: `${creditShare}%` }} />}
                                  </div>
                                  <div className="flex gap-4 mt-1.5 flex-wrap">
                                    {cashShare   > 0 && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"/>Cash {cashShare}%</span>}
                                    {momoShare   > 0 && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block"/>MoMo {momoShare}%</span>}
                                    {bankShare   > 0 && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500 inline-block"/>Bank {bankShare}%</span>}
                                    {creditShare > 0 && <span className="text-[10px] font-bold flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block"/>Credit {creditShare}%</span>}
                                  </div>
                                </div>

                                {/* Detail cards (2-row grid) */}
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                  {/* Row 1 — payment values */}
                                  {[
                                    { label: "Cash Collected",  value: GHS(e.totalCash),        color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20",   border: "border-emerald-200 dark:border-emerald-800",  sub: `${cashShare}% of total` },
                                    { label: "MoMo Collected",  value: GHS(e.totalMomo),        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20",          border: "border-blue-200 dark:border-blue-800",        sub: `${momoShare}% of total` },
                                    { label: "Bank Transfer",   value: GHS(e.totalBank ?? 0),   color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/20",      border: "border-indigo-200 dark:border-indigo-800",    sub: `${bankShare}% of total` },
                                    { label: "Credit Given",    value: GHS(e.totalCredit),      color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/20",            border: "border-red-200 dark:border-red-800",          sub: creditShare > 0 ? `${creditShare}% of total` : "No credit" },
                                    { label: "Gross Sales",     value: GHS(e.totalAmount),      color: "text-foreground",  bg: "bg-muted/40",                             border: "border-border",                               sub: `${e.itemsSold} items sold` },
                                    { label: "Net Profit",      value: GHS(e.totalProfit),      color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-950/20",      border: "border-purple-200 dark:border-purple-800",    sub: `${entryMargin}% margin` },
                                    { label: "Profit Margin",   value: `${entryMargin}%`,       color: entryMargin >= 20 ? "text-emerald-600" : entryMargin >= 10 ? "text-amber-600" : "text-red-600",
                                      bg: entryMargin >= 20 ? "bg-emerald-50 dark:bg-emerald-950/20" : entryMargin >= 10 ? "bg-amber-50 dark:bg-amber-950/20" : "bg-red-50 dark:bg-red-950/20",
                                      border: entryMargin >= 20 ? "border-emerald-200" : entryMargin >= 10 ? "border-amber-200" : "border-red-200",
                                      sub: entryMargin >= 20 ? "Good margin" : entryMargin >= 10 ? "Average margin" : "Below target" },
                                    { label: "Items Sold",      value: String(e.itemsSold),     color: "text-foreground",  bg: "bg-muted/40",                             border: "border-border",                               sub: `${GHS(Math.round(e.totalAmount / Math.max(e.itemsSold, 1)))} avg/item` },
                                  ].map(({ label, value, color, bg, border, sub }) => (
                                    <div key={label} className={`rounded-xl border ${border} ${bg} px-4 py-3`}>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                                      <p className={`text-lg font-black mt-1 ${color}`}>{value}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                                    </div>
                                  ))}
                                </div>
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
    </div>
  );
}
