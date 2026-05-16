import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginProps {
  onLogin: () => void;
  logoUrl?: string;
  companyName?: string;
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 3 + Math.random() * 6,
  delay: Math.random() * 4,
  duration: 6 + Math.random() * 8,
}));

export default function Login({ onLogin, logoUrl, companyName }: LoginProps) {
  const [user, setUser] = useState("owner_admin");
  const [pass, setPass] = useState("ChalePay2026");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Read logo from settings/localStorage if not passed as prop
  const resolvedLogo = logoUrl || localStorage.getItem("bc_logo") || "";
  const resolvedName = companyName || localStorage.getItem("bc_company") || "";

  function tryLogin() {
    if (!user || !pass) { setErr("Enter your credentials"); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  }

  return (
    <div className="min-h-screen flex" data-testid="page-login">
      {/* Animated left panel */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden" style={{ background: "hsl(222 47% 11%)" }}>
        {/* Floating particles */}
        {PARTICLES.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/10"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
            animate={{ y: [-20, 20, -20], opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Soft radial glow behind logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Centre content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-12">
          <AnimatePresence>
            {resolvedLogo ? (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                className="mb-8"
              >
                <motion.img
                  src={resolvedLogo}
                  alt="Company logo"
                  className="max-w-[280px] max-h-[200px] object-contain drop-shadow-2xl"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                className="mb-8"
              >
                <motion.div
                  className="w-32 h-32 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center"
                  animate={{ y: [0, -8, 0], rotate: [0, 1, 0, -1, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg viewBox="0 0 64 64" className="w-16 h-16 text-white/60" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="8" y="28" width="48" height="28" rx="3" />
                    <path d="M4 28L32 8l28 20" />
                    <rect x="24" y="40" width="16" height="16" />
                    <line x1="24" y1="36" x2="24" y2="40" />
                    <line x1="40" y1="36" x2="40" y2="40" />
                  </svg>
                </motion.div>
                <p className="text-white/30 text-xs text-center mt-3">Upload logo in Settings</p>
              </motion.div>
            )}
          </AnimatePresence>

          {resolvedName && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white text-xl font-black text-center mb-2"
            >
              {resolvedName}
            </motion.p>
          )}

          {/* Powered by */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="absolute bottom-8 left-0 right-0 flex justify-center"
          >
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white/40">Powered by</span>
              <span className="text-xs font-black text-white/60">ChalePay</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Owner Portal</p>
            <h2 className="text-3xl font-black text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue to your dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">Username</label>
              <input
                data-testid="input-username"
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <button onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
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

          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/50" />
              <span>Powered by <strong className="text-muted-foreground/70">ChalePay</strong></span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
