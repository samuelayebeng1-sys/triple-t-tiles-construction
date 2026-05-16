import { useState } from "react";
import { useListReports, useGetReportsSummary } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { Printer, FileText, Table2, MessageSquare, ArrowRight, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

const PERIODS = ["Today", "This Week", "This Month", "This Year"];
const BRANCH_FILTERS = ["All", ...BRANCHES];

export default function Reports() {
  const [period, setPeriod] = useState("Today");
  const [branchFilter, setBranchFilter] = useState("All");
  const [, setLocation] = useLocation();
  const { data: reports, isLoading: reportsLoading } = useListReports();
  const { data: summary, isLoading: summaryLoading } = useGetReportsSummary();

  const totals = summary ?? { totalSales: 0, totalProfit: 0, totalCash: 0, totalMomo: 0, totalCredit: 0, totalItems: 0, marginPct: 0 };

  const filtered = (reports ?? []).filter(r => branchFilter === "All" || r.branch === branchFilter);

  const grandTotal = filtered.reduce((s, r) => s + r.total, 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-reports">
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
            { label: "Cash", value: GHS(totals.totalCash), color: "text-emerald-600" },
            { label: "MoMo", value: GHS(totals.totalMomo), color: "text-blue-600" },
            { label: "Credit", value: GHS(totals.totalCredit), color: "text-red-600" },
            { label: "Profit", value: GHS(totals.totalProfit), color: "text-purple-600" },
            { label: "Margin", value: `${totals.marginPct}%`, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`mt-1.5 text-xl font-black ${color}`} data-testid={`summary-${label.toLowerCase()}`}>{summaryLoading ? "..." : value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { label: "Print Report", icon: Printer },
            { label: "Export PDF", icon: FileText },
            { label: "Excel", icon: Table2 },
            { label: "SMS Summary", icon: MessageSquare },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              data-testid={`button-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "View Credit Book", path: "/credit", color: "bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" },
          { label: "Stock Levels", path: "/stock", color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" },
          { label: "Analytics", path: "/analytics", color: "bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300" },
          { label: "Mismatches", path: "/issues", color: "bg-red-50 hover:bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300" },
        ].map(({ label, path, color }) => (
          <button key={label} onClick={() => setLocation(path)}
            className={`rounded-xl p-4 text-left text-sm font-bold transition-all flex items-center justify-between ${color}`}>
            <span>{label}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </button>
        ))}
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

          {/* Grand total footer */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grand Total ({branchFilter === "All" ? "All Branches" : branchFilter})</p>
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
