import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, BookOpen, Search, Warehouse, BarChart2, TrendingUp,
  CreditCard, AlertTriangle, Settings, Building2, LogOut, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetSettings } from "@workspace/api-client-react";

const NAV = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/entry", label: "Enter Book", icon: BookOpen },
  { path: "/stock", label: "Stock Search", icon: Search },
  { path: "/warehouses", label: "Warehouses", icon: Warehouse },
  { path: "/reports", label: "Reports", icon: BarChart2 },
  { path: "/analytics", label: "Analytics", icon: TrendingUp },
  { path: "/credit", label: "Credit Book", icon: CreditCard },
  { path: "/issues", label: "Mismatches", icon: AlertTriangle },
  { path: "/settings", label: "Settings", icon: Settings },
];

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export default function Layout({ children, onLogout }: LayoutProps) {
  const [location] = useLocation();
  const { data: settings } = useGetSettings();
  const companyName = settings?.companyName || localStorage.getItem("bc_company") || "BranchControl";
  const logoUrl = settings?.logoUrl || localStorage.getItem("bc_logo") || "";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-sidebar border-r border-sidebar-border shrink-0">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-xl object-contain bg-white/10 p-0.5" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <p className="text-sm font-black text-sidebar-foreground tracking-tight">BranchControl</p>
              <p className="text-[10px] font-semibold text-sidebar-foreground/50">by ChalePay</p>
            </div>
          </div>
          <div className="mt-3 px-2 py-1.5 bg-sidebar-accent rounded-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">Business</p>
            <p className="text-xs font-bold text-sidebar-foreground truncate">{companyName}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-sidebar-foreground/40">Menu</p>
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = location === path || (path !== "/dashboard" && location.startsWith(path));
            return (
              <Link key={path} href={path}>
                <a
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all cursor-pointer",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {path === "/issues" && (
                    <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">3</span>
                  )}
                  {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button
            onClick={onLogout}
            data-testid="button-logout"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-sidebar-foreground/60 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <div className="flex items-center justify-center gap-1.5 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            <span className="text-[10px] font-bold text-sidebar-foreground/30">Powered by <span className="text-sidebar-foreground/50">ChalePay</span></span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: "var(--content-bg-hex, hsl(var(--background)))" }}>
        {/* Accent bar — picks up --content-bar CSS variable set by Interface Customisation */}
        <div
          className="h-1 w-full shrink-0"
          style={{ background: "var(--content-bar, hsl(var(--primary)))" }}
        />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
