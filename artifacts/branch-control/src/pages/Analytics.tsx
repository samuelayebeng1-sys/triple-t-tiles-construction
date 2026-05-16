import { useGetWeeklyAnalytics, useGetTopProducts } from "@workspace/api-client-react";
import { GHS } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { useState } from "react";

const BRANCH_COLORS: Record<string, string> = {
  Spintex: "#3b82f6",
  Adenta: "#10b981",
  Kasoa: "#f59e0b",
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];
const HEAT_COLORS = ["bg-blue-50 dark:bg-blue-950/20", "bg-blue-200 dark:bg-blue-800/40", "bg-blue-400", "bg-blue-600"];

function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 16} textAnchor="middle" className="font-black" fill="hsl(222 47% 11%)" fontSize={13} fontWeight={800}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={fill} fontSize={15} fontWeight={900}>
        {GHS(value)}
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="#94a3b8" fontSize={11} fontWeight={700}>
        {(percent * 100).toFixed(0)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={innerRadius - 1} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

export default function Analytics() {
  const { data: weekly, isLoading: weeklyLoading } = useGetWeeklyAnalytics();
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts();
  const [activeIdx, setActiveIdx] = useState(0);

  const weeklyChartData = (weekly?.days ?? []).map((day, i) => {
    const entry: Record<string, string | number> = { day };
    weekly?.branches.forEach(b => { entry[b.branch] = b.data[i] ?? 0; });
    return entry;
  });

  const pieData = (topProducts ?? []).map(p => ({ name: p.name, value: p.revenue, units: p.units }));

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
          <Skeleton className="h-52 w-full rounded-xl" />
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} barSize={16} barGap={4}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: "12px", fontSize: 12, fontWeight: 700 }}
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

      {/* Top products pie chart */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="font-black text-foreground mb-1">Top Products by Revenue</h3>
        <p className="text-sm text-muted-foreground mb-5">This month's best performers</p>
        {topLoading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_200px]">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIdx}
                    activeShape={ActiveShape}
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIdx(index)}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-center">
              {pieData.map((p, i) => (
                <div
                  key={p.name}
                  data-testid={`top-product-${i}`}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all ${activeIdx === i ? "bg-muted" : "hover:bg-muted/50"}`}
                >
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.units} units</p>
                  </div>
                  <p className="text-xs font-black ml-auto whitespace-nowrap">{GHS(p.value)}</p>
                </div>
              ))}
            </div>
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
