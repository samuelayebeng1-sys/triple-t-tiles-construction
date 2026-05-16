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

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
  "#6366f1", "#eab308",
];

function heatColor(intensity: number): { bg: string; text: string } {
  if (intensity === 0)   return { bg: "#f8fafc", text: "#94a3b8" };
  if (intensity < 0.2)   return { bg: "#dcfce7", text: "#166534" };
  if (intensity < 0.4)   return { bg: "#86efac", text: "#14532d" };
  if (intensity < 0.6)   return { bg: "#4ade80", text: "#14532d" };
  if (intensity < 0.8)   return { bg: "#16a34a", text: "#ffffff" };
  return                        { bg: "#14532d", text: "#ffffff" };
}

function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 16} textAnchor="middle" fill="hsl(222 47% 11%)" fontSize={13} fontWeight={800}>
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
  const [hoveredCell, setHoveredCell] = useState<{ branch: string; day: string; value: number } | null>(null);

  const weeklyChartData = (weekly?.days ?? []).map((day, i) => {
    const entry: Record<string, string | number> = { day };
    weekly?.branches.forEach(b => { entry[b.branch] = b.data[i] ?? 0; });
    return entry;
  });

  const pieData = (topProducts ?? []).map(p => ({ name: p.name, value: p.revenue, units: p.units }));

  const allValues = (weekly?.branches ?? []).flatMap(b => b.data);
  const globalMax = allValues.length > 0 ? Math.max(...allValues) : 1;

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
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-black text-foreground">Branch × Day Sales Heatmap</h3>
            <p className="text-sm text-muted-foreground">Darker green = stronger sales day</p>
          </div>
          {hoveredCell && (
            <div className="text-right">
              <p className="text-xs font-black text-foreground">{hoveredCell.branch} · {hoveredCell.day}</p>
              <p className="text-lg font-black text-emerald-600">{GHS(hoveredCell.value)}</p>
            </div>
          )}
        </div>

        {weeklyLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1.5">
                <thead>
                  <tr>
                    <th className="w-24" />
                    {(weekly?.days ?? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]).map(d => (
                      <th key={d} className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground pb-1 px-1">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(weekly?.branches ?? []).map(b => (
                    <tr key={b.branch}>
                      <td className="text-xs font-black text-foreground pr-3 whitespace-nowrap">{b.branch}</td>
                      {b.data.map((v, i) => {
                        const intensity = globalMax > 0 ? v / globalMax : 0;
                        const { bg, text } = heatColor(intensity);
                        const day = weekly?.days[i] ?? `D${i + 1}`;
                        return (
                          <td key={i} className="p-0">
                            <div
                              onMouseEnter={() => setHoveredCell({ branch: b.branch, day, value: v })}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={`${b.branch} · ${day}: ${GHS(v)}`}
                              style={{ background: bg, color: text }}
                              className="rounded-xl h-14 flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105 hover:shadow-md select-none"
                            >
                              <span className="text-[10px] font-black opacity-70">{day}</span>
                              <span className="text-xs font-black leading-none mt-0.5">
                                {v > 0 ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) : "—"}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-5 flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Low</span>
              {[0, 0.15, 0.35, 0.55, 0.75, 1].map((v, i) => {
                const { bg } = heatColor(v);
                return (
                  <div
                    key={i}
                    className="h-4 flex-1 rounded-md transition-all"
                    style={{ background: bg, maxWidth: 40 }}
                  />
                );
              })}
              <span className="text-xs font-bold text-muted-foreground">High</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
