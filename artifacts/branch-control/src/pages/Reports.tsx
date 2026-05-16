import { useState } from "react";
import { useListReports, useGetReportsSummary } from "@workspace/api-client-react";
import { GHS, pct } from "@/lib/format";
import { Printer, FileText, Table2, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS = ["Today", "This Week", "This Month", "This Year"];

export default function Reports() {
  const [period, setPeriod] = useState("Today");
  const { data: reports, isLoading: reportsLoading } = useListReports();
  const { data: summary, isLoading: summaryLoading } = useGetReportsSummary();

  const totals = summary ?? { totalSales: 0, totalProfit: 0, totalCash: 0, totalMomo: 0, totalCredit: 0, totalItems: 0, marginPct: 0 };

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-reports">
      {/* Period filter */}
      <div>
        <h1 className="text-2xl font-black text-foreground mb-4">Reports</h1>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p}
              data-testid={`period-${p.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border-l-4 border-l-primary border border-border bg-card shadow-sm p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{period} Summary</p>
        {summaryLoading ? (
          <Skeleton className="h-14 w-48 mt-3 rounded-xl" />
        ) : (
          <>
            <h2 className="mt-3 text-5xl font-black text-foreground" data-testid="summary-total">{GHS(totals.totalSales)}</h2>
            <p className="text-muted-foreground mt-1">{totals.totalItems} items sold across all branches</p>
          </>
        )}
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

      {/* Reports list */}
      <h3 className="font-black text-foreground">All Reports</h3>
      {reportsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : !reports?.length ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No reports yet. Use Enter Book to start recording sales.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="rounded-2xl border border-border bg-card shadow-sm p-5" data-testid={`card-report-${r.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-foreground">{r.branch}</p>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">{r.date}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Locked</span>
                  </div>
                  <p className="text-2xl font-black text-foreground mt-2">{GHS(r.total)}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground space-y-0.5">
                  <p>Cash: <strong className="text-foreground">{GHS(r.cash)}</strong></p>
                  <p>MoMo: <strong className="text-foreground">{GHS(r.momo)}</strong></p>
                  <p>Credit: <strong className="text-red-600">{GHS(r.credit)}</strong></p>
                  <p>Profit: <strong className="text-emerald-600">{GHS(r.profit)}</strong></p>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, pct(r.profit, r.total))}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct(r.profit, r.total)}% profit margin · {r.itemsSold} items</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
