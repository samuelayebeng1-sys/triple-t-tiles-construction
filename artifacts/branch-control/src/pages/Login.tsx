import { useState } from "react";
import { Building2, Eye, EyeOff, TrendingUp, Package, FileBarChart, Infinity } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState("owner_admin");
  const [pass, setPass] = useState("ChalePay2026");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function tryLogin() {
    if (!user || !pass) { setErr("Enter your credentials"); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  }

  const stats = [
    { icon: Building2, value: "3", label: "Showrooms" },
    { icon: Package, value: "2", label: "Warehouses" },
    { icon: TrendingUp, value: "8", label: "Products" },
    { icon: FileBarChart, value: "∞", label: "Reports" },
  ];

  return (
    <div className="min-h-screen flex" data-testid="page-login">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-black text-white">BranchControl</p>
            <p className="text-xs font-semibold text-white/50">by ChalePay</p>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-black text-white leading-tight">
            Control your business<br />
            <span className="text-white/60">with confidence.</span>
          </h1>
          <p className="mt-4 text-white/60 text-lg leading-relaxed">
            Real-time stock, multi-branch reporting, credit management, and warehouse control — all in one place.
          </p>

          <div className="mt-10 grid grid-cols-4 gap-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-4 text-center">
                <Icon className="h-5 w-5 text-white/70 mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-xs font-semibold text-white/50 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm">© 2026 ChalePay. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Owner Portal</p>
            <h2 className="text-3xl font-black text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue to your dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                Username
              </label>
              <input
                data-testid="input-username"
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  data-testid="input-password"
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && tryLogin()}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <button
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {err && <p className="text-xs font-bold text-destructive" data-testid="text-login-error">{err}</p>}

            <button
              data-testid="button-signin"
              onClick={tryLogin}
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Demo: <span className="font-mono font-bold">owner_admin</span> / <span className="font-mono font-bold">ChalePay2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
