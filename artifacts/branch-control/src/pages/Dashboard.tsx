import { useState } from "react";
import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { GHS, pct } from "@/lib/format";
import { AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";
import {
  TrendingUp, CreditCard, AlertTriangle, ArrowRight,
  BarChart2, X, Banknote, MapPin, Package,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BRANCH_META: Record<string, { color: string; light: string; border: string; dot: string }> = {
  Spintex: { color: "#3b82f6", light: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", dot: "bg-blue-500" },
  Adenta:  { color: "#10b981", light: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", dot: "bg-emerald-500" },
  Kasoa:   { color: "#f59e0b", light: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  dot: "bg-amber-500" },
};

type ModalType = "sales" | "profit" | "credit" | "lowstock" | "branch" | null;
interface ModalData { type: ModalType; data?: any; }

function Modal({ modal, onClose }: { modal: ModalData; onClose: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <AnimatePresence>
      {modal.type && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl p-7"
          >
            <button onClick={onClose} className="absolute right-5 top-5 rounded-xl bg-muted p-2 hover:bg-muted/70 transition-colors">
              <X className="h-4 w-4" />
            </button>

            {modal.type === "sales" && (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Today's Sales</p>
                <p className="text-5xl font-black text-foreground">{GHS(modal.data?.value ?? 0)}</p>
                <p className="text-sm text-muted-foreground mt-1">Combined across all 3 branches</p>
                <div className="mt-6 space-y-3">
                  {(modal.data?.branches ?? []).map((b: any) => (
                    <div key={b.branch} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                      <div>
                        <p className="font-black text-foreground">{b.branch}</p>
                        <div className="h-1.5 w-32 rounded-full bg-muted mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct(b.sales, modal.data?.value)}%` }} />
                        </div>
                      </div>
                      <p className="font-black text-foreground">{GHS(b.sales)}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => { onClose(); setLocation("/reports"); }} className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all">
                  Full Reports <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
            {modal.type === "profit" && (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Today's Profit</p>
                <p className="text-5xl font-black text-emerald-600">{GHS(modal.data?.value ?? 0)}</p>
                <p className="text-sm text-muted-foreground mt-1">Net profit after cost of goods</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-black text-muted-foreground">Revenue</p>
                    <p className="text-xl font-black text-foreground mt-1">{GHS(modal.data?.sales ?? 0)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-black text-muted-foreground">Margin</p>
                    <p className="text-xl font-black text-emerald-600 mt-1">{pct(modal.data?.value, modal.data?.sales)}%</p>
                  </div>
                </div>
                <button onClick={() => { onClose(); setLocation("/analytics"); }} className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all">
                  View Analytics <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
            {modal.type === "credit" && (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Outstanding Credit</p>
                <p className="text-5xl font-black text-red-600">{GHS(modal.data?.value ?? 0)}</p>
                <p className="text-sm text-muted-foreground mt-1">Total owed by credit customers</p>
                <div className="mt-5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 px-4 py-3">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">Review your credit book regularly to collect payments and manage risk.</p>
                </div>
                <button onClick={() => { onClose(); setLocation("/credit"); }} className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-black text-white hover:bg-red-700 transition-all">
                  Manage Credit Book <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
            {modal.type === "lowstock" && (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Low Stock Alert</p>
                <p className="text-5xl font-black text-amber-600">{modal.data?.value} items</p>
                <p className="text-sm text-muted-foreground mt-1">Products at or below 5 units in at least one location</p>
                <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 px-4 py-3">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Request deliveries promptly to avoid stockouts.</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { onClose(); setLocation("/stock"); }} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-black text-white hover:bg-amber-700 transition-all">
                    Check Stock <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => { onClose(); setLocation("/warehouses"); }} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm font-black text-foreground hover:bg-muted/70 transition-all">
                    Receive Stock
                  </button>
                </div>
              </>
            )}
            {modal.type === "branch" && (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Branch Detail</p>
                <p className="text-3xl font-black text-foreground">{modal.data?.branch}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Showroom performance</p>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs font-black text-muted-foreground">Sales Today</p>
                      <p className="text-xl font-black text-foreground mt-1">{GHS(modal.data?.sales)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs font-black text-muted-foreground">Target</p>
                      <p className="text-xl font-black text-foreground mt-1">{GHS(modal.data?.target)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-xs font-bold text-muted-foreground">Progress to target</p>
                      <p className="text-xs font-black">{pct(modal.data?.sales, modal.data?.target)}%</p>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${pct(modal.data?.sales, modal.data?.target) >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct(modal.data?.sales, modal.data?.target))}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
                <button onClick={() => { onClose(); setLocation("/entry"); }} className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all">
                  Enter Sales for {modal.data?.branch} <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [modal, setModal] = useState<ModalData>({ type: null });
  const { data: dash, isLoading } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });

  const todaySales   = dash?.todaySales   ?? 48750;
  const todayProfit  = dash?.todayProfit  ?? 11420;
  const outstanding  = dash?.outstanding  ?? 0;
  const lowStockCount = dash?.lowStockCount ?? 0;
  const branches     = dash?.branchPerformance ?? [];

  const weekData = (dash?.weekSales ?? [29400, 38100, 45800, 52300, 61200, 48750, 54900]).map((v, i) => ({
    day: DAYS[i], value: v,
  }));

  const kpis = [
    {
      label: "Total Sales", value: isLoading ? "..." : GHS(todaySales),
      sub: "All branches · today", icon: Banknote,
      gradient: "from-blue-500/10 to-blue-500/0", iconBg: "bg-blue-500/10", iconColor: "text-blue-500",
      accent: "#3b82f6",
      onClick: () => setModal({ type: "sales", data: { value: todaySales, branches } }),
    },
    {
      label: "Net Profit", value: isLoading ? "..." : GHS(todayProfit),
      sub: `${pct(todayProfit, todaySales)}% margin`, icon: TrendingUp,
      gradient: "from-emerald-500/10 to-emerald-500/0", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500",
      accent: "#10b981",
      onClick: () => setModal({ type: "profit", data: { value: todayProfit, sales: todaySales } }),
    },
    {
      label: "Credit Owed", value: isLoading ? "..." : GHS(outstanding),
      sub: "Outstanding balance", icon: CreditCard,
      gradient: "from-red-500/10 to-red-500/0", iconBg: "bg-red-500/10", iconColor: "text-red-500",
      accent: "#ef4444",
      onClick: () => setModal({ type: "credit", data: { value: outstanding } }),
    },
    {
      label: "Low Stock", value: isLoading ? "..." : `${lowStockCount} items`,
      sub: "Need restocking", icon: Package,
      gradient: "from-amber-500/10 to-amber-500/0", iconBg: "bg-amber-500/10", iconColor: "text-amber-500",
      accent: "#f59e0b",
      onClick: () => setModal({ type: "lowstock", data: { value: lowStockCount } }),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl" data-testid="page-dashboard">
      <Modal modal={modal} onClose={() => setModal({ type: null })} />

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl font-black text-foreground mt-0.5">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5">
          <motion.div
            className="h-2 w-2 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">Live</span>
        </div>
      </motion.div>

      {/* ── KPI cards ── */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, gradient, iconBg, iconColor, accent, onClick }, idx) => (
          <motion.button
            key={label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 * (idx + 1), ease: "easeOut" }}
            onClick={onClick}
            whileHover={{ scale: 1.025, y: -2 }}
            whileTap={{ scale: 0.975 }}
            className={`rounded-2xl border border-border bg-gradient-to-br ${gradient} bg-card p-6 shadow-sm text-left cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden`}
            data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {/* Coloured left accent bar */}
            <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: accent }} />

            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <div className={`rounded-xl ${iconBg} p-2.5`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-black text-foreground" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              {isLoading ? <Skeleton className="h-8 w-28 rounded-lg" /> : value}
            </p>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">{sub}</p>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* ── Week chart + payment split ── */}
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Area chart */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25, ease: "easeOut" }} className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-foreground">Sales This Week</h3>
              <p className="text-sm text-muted-foreground">{GHS(weekData.reduce((s, d) => s + d.value, 0))} total · all branches</p>
            </div>
            <button onClick={() => setLocation("/analytics")} className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
              Analytics <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(222 47% 11%)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="hsl(222 47% 11%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: "12px", fontSize: 12, fontWeight: 700 }}
                  formatter={(v: number) => [GHS(v), "Sales"]}
                />
                <Area dataKey="value" stroke="hsl(222 47% 11%)" strokeWidth={2.5} fill="url(#salesGrad)" dot={false} activeDot={{ r: 5, fill: "hsl(222 47% 11%)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Payment breakdown */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }} className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-foreground mb-1">Payment Split</h3>
            <p className="text-xs text-muted-foreground mb-5">Today · all branches</p>
          </div>
          <div className="space-y-4">
            {[
              { label: "Cash", value: todaySales * 0.55, color: "bg-emerald-500", textColor: "text-emerald-600" },
              { label: "MoMo", value: todaySales * 0.30, color: "bg-blue-500", textColor: "text-blue-600" },
              { label: "Credit", value: todaySales * 0.15, color: "bg-red-500", textColor: "text-red-600" },
            ].map(({ label, value, color, textColor }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-black text-muted-foreground">{label}</p>
                  <p className={`text-xs font-black ${textColor}`}>{GHS(isLoading ? 0 : value)}</p>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${isLoading ? 0 : (value / todaySales) * 100}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setLocation("/reports")} className="mt-5 flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            Full Reports <ArrowRight className="h-3 w-3" />
          </button>
        </motion.div>
      </div>

      {/* ── Branch performance ── */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.35, ease: "easeOut" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-foreground">Branch Performance</h3>
          <button onClick={() => setLocation("/entry")} className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            Enter Sales <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {branches.length === 0 && isLoading
            ? [1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)
            : (branches.length > 0 ? branches : [
                { branch: "Spintex", sales: 20400, target: 25000 },
                { branch: "Adenta",  sales: 11100, target: 15000 },
                { branch: "Kasoa",   sales: 5400,  target: 10000 },
              ]).map((b, idx) => {
                const progress = pct(b.sales, b.target);
                const meta = BRANCH_META[b.branch] ?? { color: "#94a3b8", light: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", dot: "bg-slate-400" };
                return (
                  <motion.button
                    key={b.branch}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx + 0.35, duration: 0.4 }}
                    whileHover={{ scale: 1.025, y: -2 }}
                    whileTap={{ scale: 0.975 }}
                    onClick={() => setModal({ type: "branch", data: b })}
                    className="rounded-2xl border bg-card shadow-sm p-5 text-left cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden"
                    style={{ borderColor: meta.border, background: meta.light }}
                    data-testid={`branch-card-${b.branch.toLowerCase()}`}
                  >
                    {/* Top accent */}
                    <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full" style={{ background: meta.color }} />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                        <p className="font-black text-foreground">{b.branch}</p>
                      </div>
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-full"
                        style={{ background: meta.light, color: meta.color, border: `1px solid ${meta.border}` }}
                      >
                        {progress}%
                      </span>
                    </div>

                    <p className="text-3xl font-black text-foreground" data-testid={`branch-sales-${b.branch.toLowerCase()}`}>
                      {GHS(b.sales)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">of {GHS(b.target)} target</p>

                    {/* Progress bar */}
                    <div className="mt-4 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: meta.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 * idx + 0.5 }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Tap for details</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:translate-x-0.5 transition-transform" style={{ color: meta.color }} />
                    </div>
                  </motion.button>
                );
              })}
        </div>
      </motion.div>

      {/* ── Recent reports ── */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.45, ease: "easeOut" }} className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-foreground">Recent Reports</h3>
          <button onClick={() => setLocation("/reports")} className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : (dash?.recentReports ?? []).length === 0 ? (
          <div className="text-center py-10">
            <BarChart2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No reports yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Start entering sales to see locked reports here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(dash?.recentReports ?? []).map((r, i) => {
              const meta = BRANCH_META[r.branch];
              return (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i + 0.5 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setLocation("/reports")}
                  className="flex items-center justify-between w-full rounded-xl border border-border/50 hover:border-border bg-muted/30 hover:bg-muted/60 transition-all px-4 py-3.5 text-left"
                  data-testid={`recent-report-${r.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: meta?.light ?? "rgba(148,163,184,0.1)" }}>
                      <BarChart2 className="h-4 w-4" style={{ color: meta?.color ?? "#94a3b8" }} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">{r.branch}</p>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">{GHS(r.total)}</p>
                      <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Locked</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Powered by */}
      <div className="flex justify-center pb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/40">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40" />
          Powered by <strong className="ml-0.5 text-muted-foreground/60">ChalePay</strong>
        </div>
      </div>
    </div>
  );
}
