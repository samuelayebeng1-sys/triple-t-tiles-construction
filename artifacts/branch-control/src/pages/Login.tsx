import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginProps {
  onLogin: () => void;
  logoUrl?: string;
  companyName?: string;
}

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 5,
  delay: Math.random() * 5,
  duration: 5 + Math.random() * 8,
  opacity: 0.15 + Math.random() * 0.4,
}));

const ORBS = [
  { w: 500, h: 500, x: -120, y: -120, color: "rgba(99,102,241,0.18)", dur: 12 },
  { w: 400, h: 400, x: "60%", y: "55%", color: "rgba(16,185,129,0.12)", dur: 16 },
  { w: 300, h: 300, x: "20%", y: "70%", color: "rgba(245,158,11,0.10)", dur: 10 },
];

export default function Login({ onLogin, logoUrl, companyName }: LoginProps) {
  const [user, setUser] = useState("owner_admin");
  const [pass, setPass] = useState("ChalePay2026");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const resolvedLogo = logoUrl || localStorage.getItem("bc_logo") || "";
  const resolvedName = companyName || localStorage.getItem("bc_company") || "";

  function tryLogin() {
    if (!user || !pass) { setErr("Enter your credentials"); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  }

  return (
    <div className="min-h-screen flex" data-testid="page-login">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex w-1/2 relative overflow-hidden"
        style={{ background: "hsl(222 47% 8%)" }}
      >
        {/* Animated mesh grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Big colour orbs */}
        {ORBS.map((o, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: o.w, height: o.h,
              left: o.x, top: o.y,
              background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
              filter: "blur(40px)",
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut", delay: i * 2 }}
          />
        ))}

        {/* Particles */}
        {PARTICLES.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              opacity: p.opacity,
            }}
            animate={{ y: [-24, 24, -24], opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.4] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Rotating ring 1 */}
        <motion.div
          className="absolute rounded-full border border-white/10 pointer-events-none"
          style={{ width: 520, height: 520, left: "50%", top: "50%", marginLeft: -260, marginTop: -260 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        />
        {/* Rotating ring 2 — counter */}
        <motion.div
          className="absolute rounded-full border border-white/5 pointer-events-none"
          style={{
            width: 680, height: 680, left: "50%", top: "50%", marginLeft: -340, marginTop: -340,
            borderStyle: "dashed",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        {/* Rotating ring 3 — fast thin */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 380, height: 380, left: "50%", top: "50%", marginLeft: -190, marginTop: -190,
            border: "1.5px solid rgba(99,102,241,0.25)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />

        {/* Sweeping highlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.04) 40deg, transparent 80deg)",
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Centre content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-10">

          {/* Logo / placeholder */}
          <AnimatePresence mode="wait">
            {resolvedLogo ? (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.4, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.9, type: "spring", bounce: 0.4 }}
                className="mb-8 relative"
              >
                {/* Halo behind logo */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-3xl"
                  style={{ background: "rgba(99,102,241,0.35)", transform: "scale(1.6)" }}
                  animate={{ scale: [1.5, 1.9, 1.5], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.img
                  src={resolvedLogo}
                  alt="Company logo"
                  className="relative max-w-[400px] max-h-[280px] object-contain drop-shadow-2xl"
                  animate={{ y: [0, -10, 0], scale: [1, 1.02, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, scale: 0.4, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, type: "spring", bounce: 0.45 }}
                className="mb-8 relative"
              >
                {/* Outer halo */}
                <motion.div
                  className="absolute rounded-full blur-2xl"
                  style={{
                    width: 280, height: 280, left: "50%", top: "50%",
                    marginLeft: -140, marginTop: -140,
                    background: "rgba(99,102,241,0.30)",
                  }}
                  animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.85, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="relative w-48 h-48 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl"
                  animate={{ y: [0, -10, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent" />
                  <svg viewBox="0 0 64 64" className="w-24 h-24 text-white/70 relative z-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="8" y="28" width="48" height="28" rx="3" />
                    <path d="M4 28L32 8l28 20" />
                    <rect x="24" y="40" width="16" height="16" />
                    <line x1="24" y1="36" x2="24" y2="40" />
                    <line x1="40" y1="36" x2="40" y2="40" />
                  </svg>
                </motion.div>
                <motion.p
                  className="text-white/30 text-xs text-center mt-3 font-bold"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  Upload logo in Settings
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Company name */}
          {resolvedName && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-white text-2xl font-black text-center mb-2 drop-shadow-lg"
            >
              {resolvedName}
            </motion.p>
          )}

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-white/30 text-sm font-bold text-center tracking-wide"
          >
            Building Materials · 3 Branches · 2 Warehouses
          </motion.p>

          {/* Powered by */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-0 right-0 flex justify-center"
          >
            <motion.div
              className="flex items-center gap-2 bg-white/5 rounded-full px-5 py-2.5 border border-white/10 backdrop-blur-sm"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <motion.div
                className="h-2 w-2 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-xs font-bold text-white/40">Powered by</span>
              <span className="text-xs font-black text-white/70">ChalePay</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
          className="w-full max-w-md"
        >
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8"
          >
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Owner Portal</p>
            <h2 className="text-4xl font-black text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue to your dashboard</p>
          </motion.div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">Username</label>
              <input
                data-testid="input-username"
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
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
            </motion.div>

            {err && (
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-bold text-destructive"
                data-testid="text-login-error"
              >
                {err}
              </motion.p>
            )}

            <motion.button
              data-testid="button-signin"
              onClick={tryLogin}
              disabled={loading}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground transition disabled:opacity-50 relative overflow-hidden"
            >
              {/* Shimmer effect */}
              {!loading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                />
              )}
              <span className="relative z-10">{loading ? "Signing in..." : "Sign In →"}</span>
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex justify-center"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/50" />
              <span>Powered by <strong className="text-muted-foreground/70">ChalePay</strong></span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
