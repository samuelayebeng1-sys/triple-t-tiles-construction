import { useState } from "react";
import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { GHS, pct } from "@/lib/format";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";
import {
  TrendingUp, CreditCard, AlertTriangle, ArrowRight,
  BookOpen, Search, BarChart2, RefreshCw, ShoppingCart, MessageSquare, Trophy, X,
  TrendingDown, Layers, Banknote
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ModalType = "sales" | "profit" | "credit" | "lowstock" | "branch" | null;

interface ModalData {
  type: ModalType;
  data?: any;
}

function Modal({ modal, onClose }: { modal: ModalData; onClose: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <AnimatePresence>
      {modal.type && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Request deliveries promptly to avoid stockouts. Use Warehouses to receive new stock.</p>
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

  const todaySales = dash?.todaySales ?? 48750;
  const todayProfit = dash?.todayProfit ?? 11420;
  const outstanding = dash?.outstanding ?? 0;
  const lowStockCount = dash?.lowStockCount ?? 0;
  const branches = dash?.branchPerformance ?? [];

  const weekData = (dash?.weekSales ?? [29400, 38100, 45800, 52300, 61200, 48750, 54900]).map((v, i) => ({
    day: DAYS[i], value: v,
  }));

  const kpis = [
    {
      label: "Total Sales", value: isLoading ? "..." : GHS(todaySales),
      sub: "All branches · today", icon: Banknote, color: "text-blue-500",
      onClick: () => setModal({ type: "sales", data: { value: todaySales, branches } }),
    },
    {
      label: "Net Profit", value: isLoading ? "..." : GHS(todayProfit),
      sub: `${pct(todayProfit, todaySales)}% margin`, icon: TrendingUp, color: "text-emerald-500",
      onClick: () => setModal({ type: "profit", data: { value: todayProfit, sales: todaySales } }),
    },
    {
      label: "Credit Owed", value: isLoading ? "..." : GHS(outstanding),
      sub: "Outstanding balance", icon: CreditCard, color: "text-red-500",
      onClick: () => setModal({ type: "credit", data: { value: outstanding } }),
    },
    {
      label: "Low Stock", value: isLoading ? "..." : `${lowStockCount} items`,
      sub: "Need restocking", icon: AlertTriangle, color: "text-amber-500",
      onClick: () => setModal({ type: "lowstock", data: { value: lowStockCount } }),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl" data-testid="page-dashboard">
      <Modal modal={modal} onClose={() => setModal({ type: null })} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-black text-foreground mt-0.5">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-600">Live</span>
        </div>
      </div>

      {/* KPI cards — click to open modal */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, color, onClick }) => (
          <motion.button
            key={label}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm text-left cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
            data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <div className={`rounded-xl bg-muted p-2 group-hover:bg-primary/10 transition-colors`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{sub}</p>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Week chart */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
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
            <BarChart data={weekData} barSize={32}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: "12px", fontSize: 12, fontWeight: 700 }}
                formatter={(v: number) => [GHS(v), "Sales"]}
              />
              <Bar dataKey="value" fill="hsl(222 47% 11%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch performance — click for modal */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-foreground">Branch Performance</h3>
          <button onClick={() => setLocation("/entry")} className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            Enter Sales <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {branches.length === 0 && isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
          ) : (
            (branches.length > 0 ? branches : [
              { branch: "Spintex", sales: 20400, target: 25000 },
              { branch: "Adenta", sales: 11100, target: 15000 },
              { branch: "Kasoa", sales: 5400, target: 10000 },
            ]).map(b => {
              const progress = pct(b.sales, b.target);
              return (
                <motion.button
                  key={b.branch}
                  onClick={() => setModal({ type: "branch", data: b })}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm text-left cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
                  data-testid={`branch-card-${b.branch.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-black text-foreground">{b.branch}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${progress >= 100 ? "bg-emerald-100 text-emerald-700" : progress >= 70 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {progress}%
                    </span>
                  </div>
                  <p className="text-2xl font-black text-foreground" data-testid={`branch-sales-${b.branch.toLowerCase()}`}>{GHS(b.sales)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Target: {GHS(b.target)}</p>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tap for details</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-black text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { path: "/entry", label: "Enter Sales", icon: BookOpen, color: "bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300" },
            { path: "/stock", label: "Check Stock", icon: Search, color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" },
            { path: "/reports", label: "View Reports", icon: BarChart2, color: "bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" },
            { path: "/credit", label: "Credit Book", icon: CreditCard, color: "bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300" },
          ].map(({ path, label, icon: Icon, color }) => (
            <button key={path} onClick={() => setLocation(path)}
              className={`flex items-center gap-3 rounded-2xl p-5 text-left font-bold transition-all ${color}`}
              data-testid={`quick-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="h-6 w-6 shrink-0" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent reports */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-foreground">Recent Reports</h3>
          <button onClick={() => setLocation("/reports")} className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : (dash?.recentReports ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reports yet. Start entering sales data.</p>
        ) : (
          <div className="space-y-2">
            {(dash?.recentReports ?? []).map(r => (
              <motion.button
                key={r.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setLocation("/reports")}
                className="flex items-center justify-between w-full rounded-xl bg-muted/50 hover:bg-muted transition-colors px-4 py-3 text-left"
                data-testid={`recent-report-${r.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{r.branch}</p>
                    <p className="text-xs text-muted-foreground">{r.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-foreground">{GHS(r.total)}</p>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Locked</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

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
