import { useGetWeeklyAnalytics, useGetTopProducts } from "@workspace/api-client-react";
import { GHS } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertTriangle } from "lucide-react";

const BRANCH_COLORS: Record<string, string> = {
  Spintex: "#3b82f6",
  Adenta: "#10b981",
  Kasoa: "#f59e0b",
};

const HEAT_COLORS = ["bg-blue-50 dark:bg-blue-950/20", "bg-blue-200 dark:bg-blue-800/40", "bg-blue-400", "bg-blue-600"];

export default function Analytics() {
  const { data: weekly, isLoading: weeklyLoading } = useGetWeeklyAnalytics();
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts();

  const weeklyChartData = (weekly?.days ?? []).map((day, i) => {
    const entry: Record<string, string | number> = { day };
    weekly?.branches.forEach(b => { entry[b.branch] = b.data[i] ?? 0; });
    return entry;
  });

  const maxRevenue = topProducts?.[0]?.revenue ?? 1;

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-analytics">
      <div>
        <h1 className="text-2xl font-black text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance insights across all branches</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Weekly Revenue", value: GHS(148620), sub: "+12% vs last week", icon: TrendingUp, color: "text-emerald-500" },
          { label: "Best Day", value: "Saturday", sub: GHS(37300) + " avg", icon: TrendingUp, color: "text-blue-500" },
          { label: "Avg Daily", value: GHS(27800), sub: "Last 7 days", icon: TrendingUp, color: "text-purple-500" },
          { label: "Credit Risk", value: "Medium", sub: GHS(17900) + " outstanding", icon: AlertTriangle, color: "text-amber-500" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-3 text-xl font-black text-foreground" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="font-black text-foreground mb-1">Weekly Sales by Branch</h3>
        <p className="text-sm text-muted-foreground mb-5">GH₵ sales per day, all 3 showrooms</p>
        {weeklyLoading ? (
          <Skeleton className="h-44 w-full rounded-xl" />
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} barSize={16} barGap={4}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12, fontWeight: 700 }}
                  formatter={(v: number) => GHS(v)}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700 }}>{v}</span>} />
                {(weekly?.branches ?? []).map(b => (
                  <Bar key={b.branch} dataKey={b.branch} fill={BRANCH_COLORS[b.branch] ?? "#94a3b8"} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top products */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="font-black text-foreground mb-1">Top Products by Revenue</h3>
        <p className="text-sm text-muted-foreground mb-5">This month's best performers</p>
        {topLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {(topProducts ?? []).map((p, i) => {
              const barPct = Math.round((p.revenue / maxRevenue) * 100);
              const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-slate-400"];
              return (
                <div key={p.productCode} data-testid={`top-product-${p.productCode}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-muted-foreground w-4">{i + 1}</span>
                      <span className="font-bold text-foreground text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.units} units</span>
                    </div>
                    <span className="font-black text-foreground text-sm">{GHS(p.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${colors[i] ?? "bg-slate-400"} transition-all`} style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="font-black text-foreground mb-1">Branch × Day Heatmap</h3>
        <p className="text-sm text-muted-foreground mb-5">Colour intensity = sales strength</p>
        {weeklyLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
              <div />
              {(weekly?.days ?? []).map(d => (
                <div key={d} className="py-1 text-center text-xs font-bold text-muted-foreground">{d}</div>
              ))}
              {(weekly?.branches ?? []).map(b => {
                const max = Math.max(...b.data);
                return (
                  <>
                    <div key={`label-${b.branch}`} className="py-3 text-xs font-black text-foreground">{b.branch}</div>
                    {b.data.map((v, i) => {
                      const intensity = max > 0 ? v / max : 0;
                      const bg = intensity > 0.8 ? HEAT_COLORS[3] : intensity > 0.55 ? HEAT_COLORS[2] : intensity > 0.3 ? HEAT_COLORS[1] : HEAT_COLORS[0];
                      return <div key={`${b.branch}-${i}`} className={`rounded-lg h-10 ${bg}`} />;
                    })}
                  </>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs font-bold text-muted-foreground">
              <span>Low</span>
              {HEAT_COLORS.map((c, i) => <div key={i} className={`h-3 w-6 rounded ${c}`} />)}
              <span>High</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
