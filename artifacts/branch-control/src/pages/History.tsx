import { useMemo, useState } from "react";
import { useListEntries } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Minus, CalendarDays, Flame, BarChart3,
  ChevronDown, ChevronUp, Building2
} from "lucide-react";

/* ─── constants ────────────────────────────────────────── */
const PERIODS = ["This Week", "This Month", "Last 3 Months", "All Time"] as const;
type Period = typeof PERIODS[number];

const BRANCH_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  Adenta:  { dot: "#3b82f6", text: "text-blue-700 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800" },
  Spintex: { dot: "#7c3aed", text: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
  Kasoa:   { dot: "#d97706", text: "text-amber-700 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800" },
};
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── helpers ───────────────────────────────────────────── */
function filterByPeriod(entries: any[], period: Period) {
  const now = new Date();
  return entries.filter(e => {
    const d = new Date(e.createdAt);
    if (period === "This Week") {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
      return d >= start;
    }
    if (period === "This Month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === "Last 3 Months") {
      const start = new Date(now); start.setMonth(now.getMonth() - 3); start.setHours(0,0,0,0);
      return d >= start;
    }
    return true; // All Time
  });
}

function prevPeriodEntries(entries: any[], period: Period) {
  const now = new Date();
  return entries.filter(e => {
    const d = new Date(e.createdAt);
    if (period === "This Week") {
      const thisStart = new Date(now); thisStart.setDate(now.getDate() - now.getDay()); thisStart.setHours(0,0,0,0);
      const prevStart = new Date(thisStart); prevStart.setDate(prevStart.getDate() - 7);
      return d >= prevStart && d < thisStart;
    }
    if (period === "This Month") {
      const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === pm && d.getFullYear() === py;
    }
    if (period === "Last 3 Months") {
      const start = new Date(now); start.setMonth(now.getMonth() - 6); start.setHours(0,0,0,0);
      const end = new Date(now); end.setMonth(now.getMonth() - 3);
      return d >= start && d < end;
    }
    return false;
  });
}

/** Group entries by calendar date string, sorted newest first */
function groupByDay(entries: any[]): Array<{ dateStr: string; date: Date; entries: any[] }> {
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

/* ─── Heatmap ───────────────────────────────────────────── */
function Heatmap({ entries, period }: { entries: any[]; period: Period }) {
  const cells = useMemo(() => {
    const weeks = period === "This Week" ? 1 : period === "This Month" ? 5 : period === "Last 3 Months" ? 13 : 26;
    const now = new Date(); now.setHours(0,0,0,0);
    // Start from Monday of `weeks` weeks ago
    const start = new Date(now);
    const dow = (now.getDay() + 6) % 7; // Mon=0
    start.setDate(now.getDate() - dow - (weeks - 1) * 7);

    const salesByDay = new Map<string, number>();
    entries.forEach(e => {
      const d = new Date(e.createdAt); d.setHours(0,0,0,0);
      const k = d.toISOString().slice(0,10);
      salesByDay.set(k, (salesByDay.get(k) ?? 0) + e.totalAmount);
    });

    const maxSales = Math.max(...salesByDay.values(), 1);
    const result: Array<{ key: string; date: Date; sales: number; intensity: number; future: boolean }> = [];
    const cursor = new Date(start);
    while (cursor <= now) {
      const key = cursor.toISOString().slice(0,10);
      const sales = salesByDay.get(key) ?? 0;
      result.push({ key, date: new Date(cursor), sales, intensity: sales / maxSales, future: false });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [entries, period]);

  if (cells.length === 0) return null;

  // Chunk into weeks (Mon-Sun columns)
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-black text-foreground">Activity Heatmap</p>
        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{period}</span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
          <span>Low</span>
          {[0.1, 0.3, 0.55, 0.75, 1].map(v => (
            <div key={v} className="h-3 w-3 rounded-sm" style={{ background: `hsl(var(--primary) / ${v})` }} />
          ))}
          <span>High</span>
        </div>
      </div>

      {/* Day-of-week labels */}
      <div className="flex gap-1 mb-1 pl-1">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="w-6 text-center text-[8px] font-black text-muted-foreground/50">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(cell => (
              <div
                key={cell.key}
                title={`${cell.date.toLocaleDateString("en-GH", { dateStyle: "medium" })}: ${cell.sales > 0 ? GHS(cell.sales) : "No sales"}`}
                className="h-6 w-6 rounded-sm cursor-default transition-transform hover:scale-125"
                style={{
                  background: cell.sales > 0
                    ? `hsl(var(--primary) / ${Math.max(0.15, cell.intensity)})`
                    : "hsl(var(--muted))",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Trend strip ───────────────────────────────────────── */
function TrendStrip({ current, prev, period }: { current: any[]; prev: any[]; period: Period }) {
  const curSales  = current.reduce((s, e) => s + e.totalAmount, 0);
  const prevSales = prev.reduce((s, e) => s + e.totalAmount, 0);
  const change    = prevSales > 0 ? Math.round(((curSales - prevSales) / prevSales) * 100) : null;

  const days = groupByDay(current);
  const activeDays = days.length;
  const avgPerDay  = activeDays > 0 ? Math.round(curSales / activeDays) : 0;

  // Best day of week
  const byDow = Array(7).fill(0);
  const byDowCount = Array(7).fill(0);
  current.forEach(e => { const d = new Date(e.createdAt).getDay(); byDow[d] += e.totalAmount; byDowCount[d]++; });
  const bestDow = byDow.indexOf(Math.max(...byDow));
  const bestDowLabel = DAY_LABELS[bestDow];

  // Streak: consecutive days with entries up to today
  const entryDaySet = new Set(current.map(e => {
    const d = new Date(e.createdAt); d.setHours(0,0,0,0); return d.toDateString();
  }));
  let streak = 0;
  const cursor = new Date(); cursor.setHours(0,0,0,0);
  while (entryDaySet.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {/* Total sales */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Period Sales</p>
        <p className="mt-2 text-2xl font-black text-foreground leading-none">{GHS(curSales)}</p>
        {change !== null ? (
          <div className={`mt-2 flex items-center gap-1 text-xs font-bold ${change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-muted-foreground"}`}>
            {change > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : change < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {change > 0 ? "+" : ""}{change}% vs prev period
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No prior period data</p>
        )}
      </div>

      {/* Active days */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Days</p>
        <p className="mt-2 text-2xl font-black text-foreground leading-none">{activeDays}</p>
        <p className="mt-2 text-xs text-muted-foreground">{GHS(avgPerDay)} avg per active day</p>
      </div>

      {/* Best day of week */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Best Day of Week</p>
        <p className="mt-2 text-2xl font-black text-foreground leading-none">{byDow[bestDow] > 0 ? bestDowLabel : "—"}</p>
        <p className="mt-2 text-xs text-muted-foreground">{byDow[bestDow] > 0 ? `${GHS(byDow[bestDow])} total on ${bestDowLabel}s` : "Not enough data"}</p>
      </div>

      {/* Current streak */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Day Streak</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-black text-foreground leading-none">{streak}</p>
          {streak > 0 && <Flame className="h-5 w-5 text-orange-500" />}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {streak === 0 ? "No entry today yet" : streak === 1 ? "Entry today" : `${streak} consecutive days`}
        </p>
      </div>
    </div>
  );
}

/* ─── Day sparkline (mini bar chart) ───────────────────── */
function DaySalesBar({ value, max }: { value: number; max: number }) {
  const pctW = max > 0 ? Math.max((value / max) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-2 flex-1 min-w-[60px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pctW}%`, background: "hsl(var(--primary))" }} />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{GHS(value)}</span>
    </div>
  );
}

/* ─── Day-of-week pattern chart ────────────────────────── */
function DowChart({ entries }: { entries: any[] }) {
  const dowData = useMemo(() => {
    const sales  = Array(7).fill(0);
    const counts = Array(7).fill(0);
    entries.forEach(e => {
      const d = new Date(e.createdAt).getDay();
      sales[d]  += e.totalAmount;
      counts[d]++;
    });
    const max = Math.max(...sales, 1);
    return DAY_LABELS.map((label, i) => ({ label, sales: sales[i], count: counts[i], pct: sales[i] / max }));
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-black text-foreground">Sales by Day of Week</p>
        <span className="text-[10px] text-muted-foreground ml-auto">hover for totals</span>
      </div>
      <div className="flex items-end gap-2 h-20">
        {dowData.map(({ label, sales, count, pct: p }) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-lg transition-all"
              style={{
                height: `${Math.max(p * 64, sales > 0 ? 6 : 2)}px`,
                background: sales > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))",
                opacity: sales > 0 ? 1 : 0.3,
              }}
            />
            {sales > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-2 py-1.5 text-[9px] whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <p className="font-black">{label}: {GHS(sales)}</p>
                <p className="text-muted-foreground">{count} entr{count === 1 ? "y" : "ies"}</p>
              </div>
            )}
            <span className="text-[9px] font-black text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Branch trend (how each branch is performing) ─────── */
function BranchTrends({ entries, period }: { entries: any[]; period: Period }) {
  const stats = useMemo(() => {
    const now = new Date();
    // Split into first half / second half of period
    const halfway = new Date(now);
    const halfDays = period === "This Week" ? 3 : period === "This Month" ? 15 : period === "Last 3 Months" ? 45 : 90;
    halfway.setDate(now.getDate() - halfDays);

    return BRANCHES.map(branch => {
      const be     = entries.filter(e => e.branch === branch);
      const recent = be.filter(e => new Date(e.createdAt) >= halfway);
      const older  = be.filter(e => new Date(e.createdAt) < halfway);
      const total  = be.reduce((s, e) => s + e.totalAmount, 0);
      const profit = be.reduce((s, e) => s + e.totalProfit, 0);
      const recentSales = recent.reduce((s, e) => s + e.totalAmount, 0);
      const olderSales  = older.reduce((s, e) => s + e.totalAmount, 0);
      const trend = olderSales > 0
        ? Math.round(((recentSales - olderSales) / olderSales) * 100)
        : null;
      return { branch, total, profit, margin: pct(profit, total), entries: be.length, trend };
    });
  }, [entries, period]);

  const maxSales = Math.max(...stats.map(s => s.total), 1);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-black text-foreground">Branch Performance Trend</p>
      </div>
      <div className="divide-y divide-border">
        {stats.map(s => {
          const c = BRANCH_COLORS[s.branch] ?? BRANCH_COLORS["Adenta"];
          const barW = s.total > 0 ? Math.round((s.total / maxSales) * 100) : 0;
          return (
            <div key={s.branch} className="px-5 py-4 flex flex-wrap items-center gap-4">
              {/* Branch label */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.dot }} />
                <span className={`text-sm font-black ${c.text}`}>{s.branch}</span>
              </div>

              {/* Sales bar */}
              <div className="flex-1 min-w-[100px]">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: c.dot }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] font-bold text-muted-foreground">{s.entries} entr{s.entries === 1 ? "y" : "ies"}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{s.margin}% margin</span>
                </div>
              </div>

              {/* Revenue */}
              <div className="text-right shrink-0">
                <p className={`text-base font-black ${c.text}`}>{s.total > 0 ? GHS(s.total) : "—"}</p>
                <p className="text-[10px] text-muted-foreground">{s.total > 0 ? `Profit ${GHS(s.profit)}` : "No data"}</p>
              </div>

              {/* Trend badge */}
              <div className="shrink-0 w-16 text-right">
                {s.trend === null ? (
                  <span className="text-[10px] text-muted-foreground font-bold">—</span>
                ) : s.trend > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                    <TrendingUp className="h-2.5 w-2.5" />+{s.trend}%
                  </span>
                ) : s.trend < 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-red-600 bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                    <TrendingDown className="h-2.5 w-2.5" />{s.trend}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <Minus className="h-2.5 w-2.5" />0%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Timeline feed ─────────────────────────────────────── */
function TimelineFeed({ entries, period }: { entries: any[]; period: Period }) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const days = useMemo(() => groupByDay(entries), [entries]);
  const maxDayTotal = useMemo(() =>
    Math.max(...days.map(d => d.entries.reduce((s, e) => s + e.totalAmount, 0)), 1),
    [days]
  );

  function toggleDay(key: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (days.length === 0) return (
    <div className="rounded-2xl border border-border bg-card p-16 text-center">
      <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="font-bold text-muted-foreground">No activity in this period.</p>
      <p className="text-sm text-muted-foreground/60 mt-1">Start recording sales in Enter Book.</p>
    </div>
  );

  const now = new Date(); now.setHours(0,0,0,0);

  return (
    <div className="space-y-0">
      {days.map((day, di) => {
        const dayTotal   = day.entries.reduce((s, e) => s + e.totalAmount, 0);
        const dayProfit  = day.entries.reduce((s, e) => s + e.totalProfit, 0);
        const dayItems   = day.entries.reduce((s, e) => s + e.itemsSold, 0);
        const dayMargin  = pct(dayProfit, dayTotal);
        const isToday    = day.date.getTime() === now.getTime();
        const isYesterday = day.date.getTime() === now.getTime() - 86400000;
        const expanded   = expandedDays.has(day.dateStr);

        // vs previous day (next in the sorted list = older)
        const prevDay    = days[di + 1];
        const prevTotal  = prevDay ? prevDay.entries.reduce((s, e) => s + e.totalAmount, 0) : null;
        const dayChange  = prevTotal !== null && prevTotal > 0
          ? Math.round(((dayTotal - prevTotal) / prevTotal) * 100)
          : null;

        const barWidth   = Math.round((dayTotal / maxDayTotal) * 100);
        const dayLabel   = isToday ? "Today" : isYesterday ? "Yesterday" : DAY_LABELS[day.date.getDay()];
        const dateStr    = day.date.toLocaleDateString("en-GH", { month: "short", day: "numeric" });
        const branchSet  = [...new Set(day.entries.map(e => e.branch))];

        return (
          <div key={day.dateStr} className="relative pl-10">
            {/* Timeline spine */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
            {/* Timeline dot */}
            <div className={`absolute left-1.5 top-5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${isToday ? "bg-primary border-primary" : "bg-card border-border"}`}>
              {isToday && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
            </div>

            {/* Day card */}
            <div className={`mb-3 rounded-2xl border bg-card shadow-sm overflow-hidden ${isToday ? "border-primary/40" : "border-border"}`}>
              {/* Day header — always visible, click to expand */}
              <button
                onClick={() => toggleDay(day.dateStr)}
                className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-muted/20 transition-colors"
              >
                {/* Date label */}
                <div className="shrink-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-black ${isToday ? "text-primary" : "text-foreground"}`}>{dayLabel}</span>
                    <span className="text-xs text-muted-foreground font-bold">{dateStr}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {branchSet.map(b => {
                      const c = BRANCH_COLORS[b] ?? BRANCH_COLORS["Adenta"];
                      return <span key={b} className={`text-[9px] font-black px-1.5 py-0.5 rounded ${c.bg} ${c.text} border ${c.border}`}>{b}</span>;
                    })}
                  </div>
                </div>

                {/* Sales bar */}
                <div className="flex-1 min-w-[120px]">
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${barWidth}%`,
                        background: isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.7)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{dayItems} item{dayItems !== 1 ? "s" : ""} · {day.entries.length} entr{day.entries.length !== 1 ? "ies" : "y"}</span>
                    <span className={`text-[10px] font-bold ${dayMargin >= 20 ? "text-emerald-600" : dayMargin >= 10 ? "text-amber-600" : "text-red-500"}`}>{dayMargin}% margin</span>
                  </div>
                </div>

                {/* Total + trend */}
                <div className="shrink-0 text-right flex flex-col items-end gap-1">
                  <span className="text-lg font-black text-foreground">{GHS(dayTotal)}</span>
                  {dayChange !== null && (
                    <span className={`text-[10px] font-black flex items-center gap-0.5 ${dayChange > 0 ? "text-emerald-600" : dayChange < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {dayChange > 0 ? <TrendingUp className="h-3 w-3" /> : dayChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {dayChange > 0 ? "+" : ""}{dayChange}% prev
                    </span>
                  )}
                </div>

                {/* Expand chevron */}
                <div className="shrink-0">
                  {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/40" />}
                </div>
              </button>

              {/* Expanded: per-branch breakdown for the day */}
              {expanded && (
                <div className="border-t border-border px-5 py-4 bg-muted/10">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {day.entries
                      .sort((a, b) => b.totalAmount - a.totalAmount)
                      .map(e => {
                        const c = BRANCH_COLORS[e.branch] ?? BRANCH_COLORS["Adenta"];
                        const margin = pct(e.totalProfit, e.totalAmount);
                        return (
                          <div key={e.id} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.dot }} />
                                <span className={`text-xs font-black ${c.text}`}>{e.branch}</span>
                              </div>
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{e.status}</span>
                            </div>
                            <p className="text-xl font-black text-foreground">{GHS(e.totalAmount)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{e.itemsSold} items · {margin}% margin</p>

                            {/* Simple profit progress */}
                            <div className="mt-3">
                              <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.min(100, margin * 2)}%`, background: margin >= 20 ? "#059669" : margin >= 10 ? "#d97706" : "#dc2626" }}
                                />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-muted-foreground">Profit {GHS(e.totalProfit)}</span>
                                <span className={`text-[9px] font-black ${margin >= 20 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-red-600"}`}>{margin}%</span>
                              </div>
                            </div>

                            {/* Time */}
                            <p className="text-[9px] text-muted-foreground/60 mt-2">
                              {new Date(e.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                  {/* Day profit summary */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-bold">Day total</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-purple-600">Profit {GHS(dayProfit)}</span>
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
  );
}

/* ─── Page ──────────────────────────────────────────────── */
export default function HistoryPage() {
  const { data: allEntries = [], isLoading } = useListEntries();
  const [period, setPeriod] = useState<Period>("This Month");

  const filtered = useMemo(() => filterByPeriod(allEntries, period), [allEntries, period]);
  const prev     = useMemo(() => prevPeriodEntries(allEntries, period), [allEntries, period]);

  return (
    <div className="p-6 space-y-5 max-w-4xl" data-testid="page-history">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Sales Timeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trends, patterns &amp; activity over time</p>
        </div>
        {/* Period tabs */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Trend KPIs */}
          <TrendStrip current={filtered} prev={prev} period={period} />

          {/* Heatmap */}
          <Heatmap entries={filtered} period={period} />

          {/* Two-col: day-of-week chart + branch trends */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <DowChart entries={filtered} />
            <BranchTrends entries={filtered} period={period} />
          </div>

          {/* Timeline section heading */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              Activity Feed — {period} · {groupByDay(filtered).length} active day{groupByDay(filtered).length !== 1 ? "s" : ""}
            </p>
            <TimelineFeed entries={filtered} period={period} />
          </div>
        </>
      )}
    </div>
  );
}
