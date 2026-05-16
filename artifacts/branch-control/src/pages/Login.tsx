import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginProps {
  onLogin: () => void;
  logoUrl?: string;
  companyName?: string;
}

const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1.5 + Math.random() * 4,
  delay: Math.random() * 6,
  duration: 6 + Math.random() * 10,
  opacity: 0.1 + Math.random() * 0.35,
}));

export default function Login({ onLogin, logoUrl, companyName }: LoginProps) {
  const [user, setUser] = useState("owner_admin");
  const [pass, setPass] = useState("ChalePay2026");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const resolvedLogo = logoUrl || localStorage.getItem("bc_logo") || "";
  const resolvedName = companyName || localStorage.getItem("bc_company") || "BranchControl";

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
        style={{ background: "linear-gradient(160deg, hsl(222 60% 6%) 0%, hsl(240 50% 10%) 50%, hsl(222 47% 8%) 100%)" }}
      >
        {/* Mesh grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        {/* Deep background orbs — now driven by --primary */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: 700, height: 700, left: "50%", top: "50%",
            marginLeft: -350, marginTop: -350,
            background: "radial-gradient(circle, hsl(var(--primary) / 0.18) 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: 400, height: 400, left: "-10%", top: "60%",
            background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: 350, height: 350, left: "65%", top: "-5%",
            background: "radial-gradient(circle, hsl(var(--primary) / 0.09) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />

        {/* Particles */}
        {PARTICLES.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity }}
            animate={{ y: [-30, 30, -30], opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Rotating rings */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 640, height: 640, left: "50%", top: "50%", marginLeft: -320, marginTop: -320,
            border: "1px solid hsl(var(--primary) / 0.22)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 800, height: 800, left: "50%", top: "50%", marginLeft: -400, marginTop: -400,
            border: "1px dashed rgba(255,255,255,0.06)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 460, height: 460, left: "50%", top: "50%", marginLeft: -230, marginTop: -230,
            border: "1.5px solid hsl(var(--primary) / 0.28)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        />

        {/* Dot on outer ring — primary coloured */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: 640, height: 640, left: "50%", top: "50%", marginLeft: -320, marginTop: -320 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute w-3 h-3 rounded-full"
            style={{
              top: -6, left: "50%", marginLeft: -6,
              background: "hsl(var(--primary))",
              boxShadow: "0 0 12px 4px hsl(var(--primary) / 0.6)",
            }}
          />
        </motion.div>
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: 460, height: 460, left: "50%", top: "50%", marginLeft: -230, marginTop: -230 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/60" style={{ bottom: -4, left: "50%", marginLeft: -4 }} />
        </motion.div>

        {/* Sweeping conic spotlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.035) 30deg, transparent 60deg)",
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* Centre content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-10 gap-0">

          {/* Logo */}
          <AnimatePresence mode="wait">
            {resolvedLogo ? (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.3, y: 60 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 1, type: "spring", bounce: 0.35 }}
                className="relative mb-10"
              >
                <motion.div
                  className="absolute rounded-full blur-3xl pointer-events-none"
                  style={{
                    width: "140%", height: "140%", left: "-20%", top: "-20%",
                    background: "radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.img
                  src={resolvedLogo}
                  alt="Company logo"
                  className="relative max-w-[480px] max-h-[340px] w-full object-contain drop-shadow-2xl"
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, scale: 0.3, y: 60 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, type: "spring", bounce: 0.38 }}
                className="relative mb-10"
              >
                {/* Outer halo */}
                <motion.div
                  className="absolute rounded-full blur-3xl pointer-events-none"
                  style={{
                    width: 400, height: 400, left: "50%", top: "50%", marginLeft: -200, marginTop: -200,
                    background: "radial-gradient(circle, hsl(var(--primary) / 0.40) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Icon box */}
                <motion.div
                  className="relative w-64 h-64 rounded-[2.5rem] flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary) / 0.25) 0%, rgba(255,255,255,0.05) 100%)",
                    border: "1.5px solid hsl(var(--primary) / 0.30)",
                    boxShadow: "0 0 60px hsl(var(--primary) / 0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                  animate={{ y: [0, -14, 0], rotate: [0, 0.8, 0, -0.8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent" />
                  <svg viewBox="0 0 64 64" className="w-32 h-32 text-white/75 relative z-10" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="8" y="28" width="48" height="28" rx="3" />
                    <path d="M4 28L32 8l28 20" />
                    <rect x="24" y="40" width="16" height="16" />
                    <line x1="24" y1="36" x2="24" y2="40" />
                    <line x1="40" y1="36" x2="40" y2="40" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Company name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
              {resolvedName}
            </h1>
            <motion.div
              className="mt-3 mx-auto h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.85), transparent)" }}
              initial={{ width: 0 }}
              animate={{ width: "80%" }}
              transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
            />
          </motion.div>
        </div>

        {/* Powered by */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="absolute bottom-8 left-0 right-0 flex justify-center"
        >
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-5 py-2.5 border border-white/10 backdrop-blur-sm">
            <motion.div
              className="h-2 w-2 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-bold text-white/40">Powered by</span>
            <span className="text-xs font-black text-white/70">ChalePay</span>
          </div>
        </motion.div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative overflow-hidden">

        {/* Subtle accent glow behind the form */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 600, height: 600,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Top accent strip */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)" }}
        />

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
          className="w-full max-w-md relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8"
          >
            <p
              className="text-xs font-black uppercase tracking-widest mb-2"
              style={{ color: "hsl(var(--primary))" }}
            >Owner Portal</p>
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
