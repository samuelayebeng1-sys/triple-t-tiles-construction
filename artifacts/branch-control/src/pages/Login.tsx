import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, BarChart2, Package, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginProps {
  onLogin: () => void;
  logoUrl?: string;
  companyName?: string;
}

const FEATURES = [
  { icon: BarChart2, text: "Real-time sales across all branches" },
  { icon: Package, text: "Live stock levels & warehouse tracking" },
  { icon: Users, text: "Credit book & customer management" },
  { icon: ShieldCheck, text: "Owner-only secure access" },
];

export default function Login({ onLogin, logoUrl, companyName }: LoginProps) {
  const [user, setUser] = useState("owner_admin");
  const [pass, setPass] = useState("ChalePay2026");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const resolvedLogo = logoUrl || localStorage.getItem("bc_logo") || "";
  const resolvedName = companyName || localStorage.getItem("bc_company") || "";

  function tryLogin() {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 800);
  }

  return (
    <div className="min-h-screen flex" data-testid="page-login">
      {/* ── Premium left panel ── */}
      <div
        className="hidden lg:flex w-[55%] relative overflow-hidden flex-col"
        style={{ background: "linear-gradient(145deg, #0a0f1e 0%, #111827 50%, #0d1424 100%)" }}
      >
        {/* Grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Radial glow blobs */}
        <motion.div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 65%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        {/* Top brand bar */}
        <div className="relative z-10 px-12 pt-10">
          <div className="flex items-center gap-3">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt="Logo" className="h-10 object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-white/90 font-black text-sm tracking-widest uppercase">BranchControl</p>
              <p className="text-white/30 text-[10px] font-semibold tracking-widest uppercase">by ChalePay</p>
            </div>
          </div>
        </div>

        {/* Centre hero */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">
          {/* Decorative line */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Company name */}
          {resolvedName ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-4"
            >
              <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em] mb-2">Business Portal</p>
              <h1 className="text-4xl font-black text-white leading-tight tracking-tight">{resolvedName}</h1>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-4"
            >
              <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em] mb-2">Owner Portal</p>
              <h1 className="text-4xl font-black text-white leading-tight tracking-tight">Building<br />Materials<br />Management</h1>
            </motion.div>
          )}

          <p className="text-white/40 text-sm font-medium mb-10 max-w-xs leading-relaxed">
            End-to-end operations for multi-branch building suppliers in Ghana
          </p>

          {/* Features */}
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-white/50" />
                </div>
                <span className="text-white/60 text-sm font-semibold">{text}</span>
              </motion.div>
            ))}
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-10 grid grid-cols-3 gap-3"
          >
            {[
              { val: "3", label: "Branches" },
              { val: "2", label: "Warehouses" },
              { val: "8", label: "Products" },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 text-center">
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom powered by */}
        <div className="relative z-10 px-12 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Powered by ChalePay</span>
          </div>
          <span className="text-[10px] font-bold text-white/20">v2.0</span>
        </div>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">BranchControl by ChalePay</p>
          </div>

          <div className="mb-8">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Sign in</h2>
            <p className="text-muted-foreground text-sm mt-1">Owner access only</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">Username</label>
              <input
                data-testid="input-username"
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">Password</label>
              <div className="relative">
                <input
                  data-testid="input-password"
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && tryLogin()}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              data-testid="button-signin"
              onClick={tryLogin}
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </div>

          <div className="mt-8 rounded-xl bg-muted/50 border border-border px-4 py-3">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Demo Access</p>
            <div className="space-y-1">
              <p className="text-xs text-foreground">Username: <span className="font-mono font-black">owner_admin</span></p>
              <p className="text-xs text-foreground">Password: <span className="font-mono font-black">ChalePay2026</span></p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/50" />
            <span className="text-xs text-muted-foreground/50">Powered by <strong className="text-muted-foreground/70">ChalePay</strong></span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
