import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { GHS, pct } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";
import {
  TrendingUp, CreditCard, AlertTriangle, ArrowRight,
  BookOpen, Search, BarChart2, Package, RefreshCw, ShoppingCart, MessageSquare, Trophy
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: dash, isLoading } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });

  const quickActions = [
    { path: "/entry", label: "Enter Branch Book", icon: BookOpen, color: "bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
    { path: "/stock", label: "Find Stock", icon: Search, color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
    { path: "/reports", label: "View Reports", icon: BarChart2, color: "bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
    { path: "/credit", label: "Credit Book", icon: CreditCard, color: "bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  ];

  const weekData = (dash?.weekSales ?? [29400, 38100, 45800, 52300, 61200, 48750, 54900]).map((v, i) => ({
    day: DAYS[i],
    value: v,
  }));

  const todaySales = dash?.todaySales ?? 48750;
  const todayProfit = dash?.todayProfit ?? 11420;
  const outstanding = dash?.outstanding ?? 0;
  const lowStockCount = dash?.lowStockCount ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl" data-testid="page-dashboard">
      {/* Hero card */}
      <div className="rounded-2xl bg-primary p-8 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-foreground/50">Live · {new Date().toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}</p>
              <h1 className="text-2xl font-black mt-1">Today's Overview</h1>
              <p className="text-primary-foreground/60 text-sm">All branches combined</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Sales", value: isLoading ? "..." : GHS(todaySales) },
              { label: "Profit", value: isLoading ? "..." : GHS(todayProfit) },
              { label: "Outstanding", value: isLoading ? "..." : GHS(outstanding) },
              { label: "Low Stock", value: isLoading ? "..." : `${lowStockCount} items` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-primary-foreground/50 uppercase tracking-widest">{label}</p>
                <p className="mt-1.5 text-2xl font-black text-primary-foreground" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Week bar chart */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs font-bold text-primary-foreground/40 mb-3">Sales this week · GH₵</p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} barSize={24}>
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="value" fill="rgba(255,255,255,0.25)" radius={[4, 4, 0, 0]}
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map(({ path, label, icon: Icon, color }) => (
          <button
            key={path}
            data-testid={`quick-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setLocation(path)}
            className={`flex items-center gap-3 rounded-2xl p-5 text-left font-bold transition-all ${color}`}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Transactions", value: "143", sub: "Today", icon: RefreshCw, color: "text-blue-500" },
          { label: "Best Branch", value: "Spintex", sub: GHS(20400), icon: Trophy, color: "text-emerald-500" },
          { label: "Avg Basket", value: GHS(341), sub: "Per sale today", icon: ShoppingCart, color: "text-purple-500" },
          { label: "SMS Sent", value: "24", sub: "Customer alerts", icon: MessageSquare, color: "text-slate-500" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-foreground" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Branch performance */}
      <div className="grid gap-4 md:grid-cols-3">
        {(dash?.branchPerformance ?? [
          { branch: "Spintex", sales: 20400, target: 25000 },
          { branch: "Adenta", sales: 11100, target: 15000 },
          { branch: "Kasoa", sales: 5400, target: 10000 },
        ]).map(({ branch, sales, target }) => {
          const progress = pct(sales, target);
          return (
            <div key={branch} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-black text-foreground">{branch}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${progress >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {progress}% of target
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-foreground" data-testid={`branch-sales-${branch.toLowerCase()}`}>{GHS(sales)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Target: {GHS(target)}</p>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </div>
          );
        })}
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
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
