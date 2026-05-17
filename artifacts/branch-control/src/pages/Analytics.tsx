import { useGetWeeklyAnalytics, useGetTopProducts, useListEntries } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector, LineChart, Line, CartesianGrid, ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";

const BRANCH_COLORS: Record<string, string> = {
  Spintex: "#3b82f6",
  Adenta:  "#10b981",
  Kasoa:   "#f59e0b",
};

const PIE_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#8b5cf6","#f43f5e",
  "#06b6d4","#84cc16","#f97316","#ec4899","#14b8a6",
  "#6366f1","#eab308",
];

function heatColor(intensity: number): { bg: string; text: string } {
  if (intensity === 0)  return { bg: "#f1f5f9", text: "#94a3b8" };
  if (intensity < 0.2)  return { bg: "#60a5fa", text: "#1e3a5f" };
  if (intensity < 0.4)  return { bg: "#34d399", text: "#064e3b" };
  if (intensity < 0.6)  return { bg: "#fde047", text: "#713f12" };
  if (intensity < 0.8)  return { bg: "#fb923c", text: "#7c2d12" };
  return                       { bg: "#ef4444", text: "#ffffff" };
}

function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 16} textAnchor="middle" fill="hsl(222 47% 11%)" fontSize={13} fontWeight={800}>{payload.name}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={fill} fontSize={15} fontWeight={900}>{GHS(value)}</text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="#94a3b8" fontSize={11} fontWeight={700}>{(percent * 100).toFixed(0)}%</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={innerRadius - 1} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

/* ── Trend badge ─────────────────────────────────────── */
function TrendBadge({ pct: p, size = "md" }: { pct: number; size?: "sm" | "md" }) {
  const abs = Math.abs(p);
  const isUp = p > 0;
  const isFlat = abs < 1;
  const cls = isFlat
    ? "bg-muted text-muted-foreground"
    : isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-black ${textSize} ${cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {isFlat ? "Flat" : abs.toFixed(1) + "%"}
    </span>
  );
}

/* ── Derived comparison helpers ─────────────────────── */
function startOf(unit: "day" | "week" | "month" | "year", offset = 0): Date {
  const d = new Date();
  if (unit === "day") {
    d.setDate(d.getDate() - offset);
    d.setHours(0, 0, 0, 0);
  } else if (unit === "week") {
    d.setDate(d.getDate() - d.getDay() - offset * 7);
    d.setHours(0, 0, 0, 0);
  } else if (unit === "month") {
    d.setMonth(d.getMonth() - offset, 1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setFullYear(d.getFullYear() - offset, 0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}
function endOf(unit: "day" | "week" | "month" | "year", offset = 0): Date {
  const s = startOf(unit, offset - 1 === -1 ? 0 : offset - 1);
  if (offset === 0) return new Date(); // up to now
  // end = start of next period minus 1ms
  const next = startOf(unit, offset - 1);
  return new Date(next.getTime() - 1);
}

function sumEntries(entries: any[], from: Date, to: Date, branch?: string) {
  return entries
    .filter(e => {
      const d = new Date(e.createdAt);
      return d >= from && d <= to && (!branch || e.branch === branch);
    })
    .reduce((s, e) => s + e.totalAmount, 0);
}

function changePct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

/* ── Comparison row card ─────────────────────────────── */
function CompareRow({ label, current, previous, currentLabel, previousLabel }: {
  label: string; current: number; previous: number;
  currentLabel: string; previousLabel: string;
}) {
  const change = changePct(current, previous);
  const isUp = change > 0;
  const isFlat = Math.abs(change) < 1;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="w-28 shrink-0">
        <p className="text-xs font-black text-foreground">{label}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFlat ? "bg-muted-foreground/40" : isUp ? "bg-emerald-500" : "bg-red-400"}`}
              style={{ width: previous === 0 ? "100%" : `${Math.min(100, (current / Math.max(current, previous)) * 100)}%` }}
            />
          </div>
          <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-muted-foreground/30"
              style={{ width: current === 0 ? "100%" : `${Math.min(100, (previous / Math.max(current, previous)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{currentLabel}: <strong className="text-foreground">{GHS(current)}</strong></span>
          <span className="text-[10px] text-muted-foreground">{previousLabel}: <strong className="text-foreground">{GHS(previous)}</strong></span>
        </div>
      </div>
      <div className="w-20 shrink-0 text-right">
        <TrendBadge pct={change} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: weekly, isLoading: weeklyLoading } = useGetWeeklyAnalytics();
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts();
  const { data: allEntries = [] } = useListEntries();
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ branch: string; day: string; value: number } | null>(null);
  const [compareView, setCompareView] = useState<"day" | "week" | "month">("week");

  /* ── Computed comparison data ──────────────────────── */
  const comparison = useMemo(() => {
    const now      = startOf("day", 0);
    const yd       = startOf("day", 1);
    const ydEnd    = new Date(now.getTime() - 1);

    const wkStart  = startOf("week", 0);
    const lwStart  = startOf("week", 1);
    const lwEnd    = new Date(wkStart.getTime() - 1);

    const moStart  = startOf("month", 0);
    const lmStart  = startOf("month", 1);
    const lmEnd    = new Date(moStart.getTime() - 1);

    // All branches totals
    const todayTotal   = sumEntries(allEntries, now, new Date());
    const ydTotal      = sumEntries(allEntries, yd, ydEnd);
    const thisWkTotal  = sumEntries(allEntries, wkStart, new Date());
    const lastWkTotal  = sumEntries(allEntries, lwStart, lwEnd);
    const thisMoTotal  = sumEntries(allEntries, moStart, new Date());
    const lastMoTotal  = sumEntries(allEntries, lmStart, lmEnd);

    // Per-branch for current view
    const branchDay  = BRANCHES.map(b => ({
      branch: b, current: sumEntries(allEntries, now, new Date(), b),
      prev: sumEntries(allEntries, yd, ydEnd, b),
    }));
    const branchWeek = BRANCHES.map(b => ({
      branch: b, current: sumEntries(allEntries, wkStart, new Date(), b),
      prev: sumEntries(allEntries, lwStart, lwEnd, b),
    }));
    const branchMonth = BRANCHES.map(b => ({
      branch: b, current: sumEntries(allEntries, moStart, new Date(), b),
      prev: sumEntries(allEntries, lmStart, lmEnd, b),
    }));

    return {
      day:   { current: todayTotal,  prev: ydTotal,     currentLabel: "Today",      prevLabel: "Yesterday",   byBranch: branchDay },
      week:  { current: thisWkTotal, prev: lastWkTotal, currentLabel: "This Week",  prevLabel: "Last Week",   byBranch: branchWeek },
      month: { current: thisMoTotal, prev: lastMoTotal, currentLabel: "This Month", prevLabel: "Last Month",  byBranch: branchMonth },
    };
  }, [allEntries]);

  /* ── 4-week branch trend sparklines ──────────────────── */
  const branchTrends = useMemo(() => {
    return BRANCHES.map(branch => {
      const weeks = [3, 2, 1, 0].map(offset => {
        const s = startOf("week", offset);
        const e = offset === 0 ? new Date() : new Date(startOf("week", offset - 1).getTime() - 1);
        return { week: offset === 0 ? "This Wk" : offset === 1 ? "Last Wk" : `W-${offset}`, value: sumEntries(allEntries, s, e, branch) };
      });
      const last = weeks[weeks.length - 1].value;
      const prev = weeks[weeks.length - 2].value;
      return { branch, weeks, change: changePct(last, prev) };
    });
  }, [allEntries]);

  /* ── Daily breakdown (last 7 days) ──────────────────── */
  const dailyTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i;
      const s = startOf("day", offset);
      const e = offset === 0 ? new Date() : new Date(startOf("day", offset - 1).getTime() - 1);
      const label = offset === 0 ? "Today" : offset === 1 ? "Yday" :
        s.toLocaleDateString("en-GH", { weekday: "short" });
      return {
        label,
        total: sumEntries(allEntries, s, e),
        ...Object.fromEntries(BRANCHES.map(b => [b, sumEntries(allEntries, s, e, b)])),
      };
    });
  }, [allEntries]);

  const activeComparison = comparison[compareView];

  /* ── Existing chart data ─────────────────────────────── */
  const weeklyChartData = (weekly?.days ?? []).map((day, i) => {
    const entry: Record<string, string | number> = { day };
    weekly?.branches.forEach(b => { entry[b.branch] = b.data[i] ?? 0; });
    return entry;
  });
  const pieData    = (topProducts ?? []).map(p => ({ name: p.name, value: p.revenue, units: p.units }));
  const allValues  = (weekly?.branches ?? []).flatMap(b => b.data);
  const globalMax  = allValues.length > 0 ? Math.max(...allValues) : 1;

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-analytics">
      <div>
        <h1 className="text-2xl font-black text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance insights &amp; progress comparisons</p>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
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
            <p className="mt-3 text-xl font-black text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          PERIOD COMPARISON
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <h3 className="font-black text-foreground">Period Comparison</h3>
            <p className="text-sm text-muted-foreground">How each branch is performing vs the same prior period</p>
          </div>
          <div className="flex gap-1.5 rounded-xl bg-muted p-1">
            {(["day","week","month"] as const).map(v => (
              <button key={v} onClick={() => setCompareView(v)}
                className={`rounded-lg px-4 py-1.5 text-xs font-black transition-all ${compareView === v ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {v === "day" ? "Day" : v === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>

        {/* Overall banner */}
        <div className={`rounded-2xl p-4 mb-4 flex items-center justify-between gap-4 ${Math.abs(changePct(activeComparison.current, activeComparison.prev)) < 1 ? "bg-muted/50" : changePct(activeComparison.current, activeComparison.prev) > 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50" : "bg-red-50 dark:bg-red-950/30 border border-red-200/50"}`}>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">All Branches · {activeComparison.currentLabel}</p>
            <p className="text-3xl font-black text-foreground mt-1">{GHS(activeComparison.current)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{activeComparison.prevLabel}: {GHS(activeComparison.prev)}</p>
          </div>
          <div className="text-right">
            <TrendBadge pct={changePct(activeComparison.current, activeComparison.prev)} />
            <p className="text-xs text-muted-foreground mt-2">
              {changePct(activeComparison.current, activeComparison.prev) >= 0
                ? "+" + GHS(activeComparison.current - activeComparison.prev)
                : "-" + GHS(activeComparison.prev - activeComparison.current)
              } vs {activeComparison.prevLabel.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Per-branch comparison rows */}
        <div>
          {activeComparison.byBranch.map(({ branch, current, prev }) => (
            <CompareRow
              key={branch}
              label={branch}
              current={current}
              previous={prev}
              currentLabel={activeComparison.currentLabel}
              previousLabel={activeComparison.prevLabel}
            />
          ))}
        </div>

        {allEntries.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Enter sales data to see comparisons.
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          BRANCH PROGRESS (4-WEEK TREND)
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <div className="mb-5">
          <h3 className="font-black text-foreground">Branch Progress — Last 4 Weeks</h3>
          <p className="text-sm text-muted-foreground">Weekly revenue trend per branch with growth indicator</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {branchTrends.map(({ branch, weeks, change }) => {
            const max = Math.max(...weeks.map(w => w.value), 1);
            const color = BRANCH_COLORS[branch] ?? "#94a3b8";
            return (
              <div key={branch} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: color }}/>
                    <p className="text-sm font-black text-foreground">{branch}</p>
                  </div>
                  <TrendBadge pct={change} />
                </div>
                {/* Mini line chart */}
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeks} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[0, max * 1.2]} />
                      <Tooltip
                        contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: "8px", fontSize: 11, fontWeight: 700 }}
                        formatter={(v: number) => [GHS(v), branch]}
                      />
                      <ReferenceLine y={weeks[weeks.length - 2]?.value ?? 0} stroke={color} strokeDasharray="3 3" strokeOpacity={0.4} />
                      <Line
                        type="monotone" dataKey="value" stroke={color} strokeWidth={2.5}
                        dot={{ fill: color, r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Week values below chart */}
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {weeks.map(w => (
                    <div key={w.week} className="text-center">
                      <p className="text-[9px] text-muted-foreground font-bold">{w.week}</p>
                      <p className="text-[10px] font-black text-foreground truncate">{w.value > 0 ? (w.value >= 1000 ? (w.value/1000).toFixed(1)+"k" : w.value) : "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DAILY SALES — LAST 7 DAYS
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="font-black text-foreground mb-1">Daily Sales — Last 7 Days</h3>
        <p className="text-sm text-muted-foreground mb-5">Revenue per branch per day, most recent on the right</p>
        {allEntries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No entry data yet.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrend} barSize={14} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: "12px", fontSize: 12, fontWeight: 700 }}
                  formatter={(v: number) => GHS(v)}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700 }}>{v}</span>}/>
                {BRANCHES.map(b => (
                  <Bar key={b} dataKey={b} fill={BRANCH_COLORS[b] ?? "#94a3b8"} radius={[4,4,0,0]}/>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick stat rows below chart */}
        {allEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3">
            {[
              { label: "Today vs Yesterday", current: comparison.day.current, prev: comparison.day.prev, cl: "Today", pl: "Yday" },
              { label: "This Week vs Last", current: comparison.week.current, prev: comparison.week.prev, cl: "This Wk", pl: "Last Wk" },
              { label: "This Month vs Last", current: comparison.month.current, prev: comparison.month.prev, cl: "This Mo", pl: "Last Mo" },
            ].map(({ label, current, prev, cl, pl }) => (
              <div key={label} className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                <p className="text-base font-black text-foreground">{GHS(current)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendBadge pct={changePct(current, prev)} size="sm"/>
                  <span className="text-[10px] text-muted-foreground">vs {GHS(prev)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weekly bar chart (original) ───────────────── */}
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

      {/* ── Top products pie chart (original) ─────────── */}
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
                    activeIndex={activeIdx} activeShape={ActiveShape}
                    data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110}
                    dataKey="value" onMouseEnter={(_, index) => setActiveIdx(index)}
                  >
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-center">
              {pieData.map((p, i) => (
                <div key={p.name} onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all ${activeIdx === i ? "bg-muted" : "hover:bg-muted/50"}`}>
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

      {/* ── Heatmap (original) ────────────────────────── */}
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
            <div className="flex-1 space-y-3">
              <div className="flex">
                <div className="w-20 shrink-0" />
                <div className="flex-1 grid grid-cols-7">
                  {(weekly?.days ?? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]).map(d => (
                    <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">{d}</div>
                  ))}
                </div>
              </div>
              {(weekly?.branches ?? []).map(b => {
                const colors = b.data.map(v => heatColor(globalMax > 0 ? v / globalMax : 0).bg);
                return (
                  <div key={b.branch} className="flex items-center gap-0">
                    <div className="w-20 shrink-0 text-xs font-black text-foreground pr-3 text-right">{b.branch}</div>
                    <div className="flex-1 relative">
                      <div className="h-14 rounded-2xl w-full" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }} />
                      <div className="absolute inset-0 grid grid-cols-7">
                        {b.data.map((v, i) => {
                          const day = weekly?.days[i] ?? `D${i+1}`;
                          const intensity = globalMax > 0 ? v / globalMax : 0;
                          const textCol = intensity > 0.4 ? "#ffffff" : "#1e293b";
                          return (
                            <div key={i} className="flex items-center justify-center cursor-default h-full"
                              onMouseEnter={() => setHoveredCell({ branch: b.branch, day, value: v })}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={`${b.branch} · ${day}: ${GHS(v)}`}>
                              <span className="text-[10px] font-black select-none" style={{ color: textCol }}>
                                {v > 0 ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : "—"}
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
            <div className="flex flex-col items-center gap-1 shrink-0 w-14 pt-6">
              <span className="text-[10px] font-black text-muted-foreground mb-1">100%</span>
              <div className="flex-1 w-7 rounded-xl" style={{ background: "linear-gradient(to bottom, #ef4444, #fb923c, #fde047, #34d399, #60a5fa)", minHeight: 120 }} />
              <span className="text-[10px] font-black text-muted-foreground mt-1">25%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
