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
  if (intensity === 0)   return { bg: "#f1f5f9", text: "#94a3b8" };
  if (intensity < 0.2)   return { bg: "#60a5fa", text: "#1e3a5f" };
  if (intensity < 0.4)   return { bg: "#34d399", text: "#064e3b" };
  if (intensity < 0.6)   return { bg: "#fde047", text: "#713f12" };
  if (intensity < 0.8)   return { bg: "#fb923c", text: "#7c2d12" };
  return                        { bg: "#ef4444", text: "#ffffff" };
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
            <p className="text-sm text-muted-foreground">Red = hottest sales · Blue = lowest</p>
          </div>
          {hoveredCell && (
            <div className="text-right">
              <p className="text-xs font-black text-foreground">{hoveredCell.branch} · {hoveredCell.day}</p>
              <p className="text-lg font-black" style={{ color: heatColor(globalMax > 0 ? hoveredCell.value / globalMax : 0).bg }}>
                {GHS(hoveredCell.value)}
              </p>
            </div>
          )}
        </div>

        {weeklyLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : (
          <div className="flex gap-5">
            {/* Heatmap bands */}
            <div className="flex-1 space-y-3">
              {/* Day labels */}
              <div className="flex">
                <div className="w-20 shrink-0" />
                <div className="flex-1 grid grid-cols-7">
                  {(weekly?.days ?? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]).map(d => (
                    <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">{d}</div>
                  ))}
                </div>
              </div>

              {/* Branch rows — smooth gradient bands */}
              {(weekly?.branches ?? []).map(b => {
                const colors = b.data.map(v => heatColor(globalMax > 0 ? v / globalMax : 0).bg);
                const gradient = `linear-gradient(to right, ${colors.join(", ")})`;
                return (
                  <div key={b.branch} className="flex items-center gap-0">
                    <div className="w-20 shrink-0 text-xs font-black text-foreground pr-3 text-right">{b.branch}</div>
                    <div className="flex-1 relative">
                      {/* Smooth gradient bar */}
                      <div
                        className="h-14 rounded-2xl w-full"
                        style={{ background: gradient }}
                      />
                      {/* Day dividers + hover targets */}
                      <div className="absolute inset-0 grid grid-cols-7">
                        {b.data.map((v, i) => {
                          const day = weekly?.days[i] ?? `D${i+1}`;
                          const intensity = globalMax > 0 ? v / globalMax : 0;
                          const textCol = intensity > 0.4 ? "#ffffff" : "#1e293b";
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-center cursor-default h-full"
                              onMouseEnter={() => setHoveredCell({ branch: b.branch, day, value: v })}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={`${b.branch} · ${day}: ${GHS(v)}`}
                            >
                              <span className="text-[10px] font-black select-none" style={{ color: textCol }}>
                                {v > 0 ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend sidebar */}
            <div className="flex flex-col items-center gap-1 shrink-0 w-14 pt-6">
              <span className="text-[10px] font-black text-muted-foreground mb-1">100%</span>
              <div
                className="flex-1 w-7 rounded-xl"
                style={{
                  background: "linear-gradient(to bottom, #ef4444, #fb923c, #fde047, #34d399, #60a5fa)",
                  minHeight: 120
                }}
              />
              <span className="text-[10px] font-black text-muted-foreground mt-1">25%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
