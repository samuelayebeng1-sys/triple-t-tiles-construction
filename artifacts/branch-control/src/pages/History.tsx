import { useMemo, useState } from "react";
import { useListEntries } from "@workspace/api-client-react";
import { GHS, pct, BRANCHES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown, ChevronUp, FileText, Table2,
  X, Download, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PERIODS = ["Today", "This Week", "This Month", "All Time"] as const;
type Period = typeof PERIODS[number];
const BRANCH_FILTERS = ["All", ...BRANCHES] as const;

const BRANCH_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  Adenta:  { dot: "#3b82f6", text: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30",    border: "border-blue-200 dark:border-blue-800" },
  Spintex: { dot: "#7c3aed", text: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
  Kasoa:   { dot: "#d97706", text: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800" },
};

function filterByPeriod(entries: any[], period: Period) {
  const now = new Date();
  return entries.filter(e => {
    const d = new Date(e.createdAt);
    if (period === "Today") return d.toDateString() === now.toDateString();
    if (period === "This Week") {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
      return d >= start;
    }
    if (period === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

/* ── Export Modal ─────────────────────────────────────── */
function ExportModal({ type, entries, branchFilter, period, onClose }: {
  type: "pdf" | "excel"; entries: any[]; branchFilter: string; period: string; onClose: () => void;
}) {
  const [done, setDone] = useState(false);
  const company = localStorage.getItem("bc_company") || "BranchControl";
  const today   = new Date().toLocaleDateString("en-GH", { dateStyle: "long" });
  const total   = entries.reduce((s,e) => s + e.totalAmount, 0);
  const profit  = entries.reduce((s,e) => s + e.totalProfit, 0);
  const cash    = entries.reduce((s,e) => s + e.totalCash, 0);
  const momo    = entries.reduce((s,e) => s + e.totalMomo, 0);
  const bank    = entries.reduce((s,e) => s + (e.totalBank??0), 0);
  const credit  = entries.reduce((s,e) => s + e.totalCredit, 0);
  const fname   = `BranchControl_History_${period.replace(/\s+/g,"_")}.${type === "pdf" ? "pdf" : "xlsx"}`;

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div initial={{opacity:0,y:36,scale:0.96}} animate={{opacity:1,y:0,scale:1}}
          exit={{opacity:0,y:36,scale:0.96}} transition={{type:"spring",bounce:0.18}}
          onClick={e=>e.stopPropagation()}
          className="relative z-10 w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${type==="pdf"?"bg-red-100 dark:bg-red-900/30":"bg-emerald-100 dark:bg-emerald-900/30"}`}>
                {type==="pdf" ? <FileText className="h-4 w-4 text-red-600"/> : <Table2 className="h-4 w-4 text-emerald-600"/>}
              </div>
              <div>
                <p className="font-black text-sm text-foreground">{type==="pdf"?"PDF Preview":"Excel Preview"}</p>
                <p className="text-xs text-muted-foreground">{fname}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl bg-muted p-2 hover:bg-muted/70 transition-colors"><X className="h-4 w-4"/></button>
          </div>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}}
                className="flex flex-col items-center py-14">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600"/>
                </div>
                <p className="text-lg font-black text-foreground">Export Ready</p>
                <p className="text-sm text-muted-foreground mt-1">{fname}</p>
              </motion.div>
            ) : (
              <motion.div key="preview" className="p-4 space-y-4">
                {type === "pdf" ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-[10px]">
                    <div className="bg-[#0f172a] px-5 py-3 flex justify-between">
                      <div><p className="text-white font-black">{company}</p><p className="text-white/50 text-[9px]">Sales History · {period} · {branchFilter==="All"?"All Branches":branchFilter}</p></div>
                      <div className="text-right"><p className="text-white/70 text-[9px]">{today}</p><p className="text-white/50 text-[9px]">{entries.length} entries</p></div>
                    </div>
                    <div className="grid grid-cols-6 border-b border-gray-100">
                      {[["Total",GHS(total)],["Profit",GHS(profit)],["Cash",GHS(cash)],["MoMo",GHS(momo)],["Bank",GHS(bank)],["Credit",GHS(credit)]].map(([l,v])=>(
                        <div key={l} className="px-3 py-2 border-r border-gray-100 last:border-0">
                          <p className="text-gray-400 text-[8px] uppercase font-bold">{l}</p>
                          <p className="font-black mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-auto max-h-52">
                      <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-100">
                          {["Branch","Date","Total","Cash","MoMo","Bank","Credit","Profit","Margin"].map(h=>(
                            <th key={h} className="px-3 py-1.5 text-left text-[8px] font-black uppercase text-gray-400">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {entries.map((e,i)=>(
                            <tr key={e.id} className={i%2===0?"bg-white":"bg-gray-50/50"}>
                              <td className="px-3 py-1.5 font-bold">{e.branch}</td>
                              <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("en-GH",{dateStyle:"short"})}</td>
                              <td className="px-3 py-1.5 font-black">{GHS(e.totalAmount)}</td>
                              <td className="px-3 py-1.5 text-[#059669]">{GHS(e.totalCash)}</td>
                              <td className="px-3 py-1.5 text-[#2563eb]">{GHS(e.totalMomo)}</td>
                              <td className="px-3 py-1.5 text-[#4f46e5]">{GHS(e.totalBank??0)}</td>
                              <td className="px-3 py-1.5 text-[#dc2626]">{GHS(e.totalCredit)}</td>
                              <td className="px-3 py-1.5 text-[#7c3aed]">{GHS(e.totalProfit)}</td>
                              <td className="px-3 py-1.5 text-gray-500">{pct(e.totalProfit,e.totalAmount)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="bg-gray-100 border-t-2 border-gray-200 font-black text-[10px]">
                          <td className="px-3 py-1.5 text-gray-700" colSpan={2}>TOTAL ({entries.length})</td>
                          <td className="px-3 py-1.5">{GHS(total)}</td>
                          <td className="px-3 py-1.5 text-[#059669]">{GHS(cash)}</td>
                          <td className="px-3 py-1.5 text-[#2563eb]">{GHS(momo)}</td>
                          <td className="px-3 py-1.5 text-[#4f46e5]">{GHS(bank)}</td>
                          <td className="px-3 py-1.5 text-[#dc2626]">{GHS(credit)}</td>
                          <td className="px-3 py-1.5 text-[#7c3aed]">{GHS(profit)}</td>
                          <td className="px-3 py-1.5 text-gray-500">{pct(profit,total)}%</td>
                        </tr></tfoot>
                      </table>
                    </div>
                    <div className="px-5 py-1.5 border-t border-gray-100 bg-gray-50 flex justify-between">
                      <p className="text-gray-300 text-[8px]">Generated by BranchControl · ChalePay</p>
                      <p className="text-gray-300 text-[8px]">{entries.length} records · {pct(profit,total)}% margin</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 overflow-hidden text-[10px] bg-white">
                    <div className="bg-[#1d6f42] px-4 py-2 flex items-center gap-2">
                      <Table2 className="h-3.5 w-3.5 text-white/80"/>
                      <span className="text-white font-bold">{fname}</span>
                    </div>
                    <div className="flex bg-gray-100 border-b border-gray-200 px-2 pt-1.5 gap-1">
                      <div className="bg-white border border-gray-200 border-b-0 rounded-t px-3 py-1 font-black text-[#1d6f42]">History</div>
                    </div>
                    <div className="grid grid-cols-4 border-b border-gray-200 bg-[#e8f4f0]/60">
                      {[["TOTAL",GHS(total)],["PROFIT",GHS(profit)],["CASH",GHS(cash)],["BANK",GHS(bank)]].map(([l,v])=>(
                        <div key={l} className="px-3 py-2 border-r border-gray-200 last:border-0">
                          <p className="text-gray-400 text-[8px] font-black tracking-widest">{l}</p>
                          <p className="font-black text-[11px] text-[#1d6f42] mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-auto max-h-52">
                      <table className="w-full border-collapse">
                        <thead><tr className="bg-[#1d6f42]">
                          {["#","Branch","Date","Total","Cash","MoMo","Bank","Credit","Profit","Margin"].map(h=>(
                            <th key={h} className="px-2 py-1.5 text-left text-[8px] font-black text-white border-r border-white/10 last:border-0 whitespace-nowrap">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {entries.map((e,i)=>(
                            <tr key={e.id} className={i%2===0?"bg-white":"bg-[#f0faf5]/60"}>
                              <td className="px-2 py-1.5 text-gray-300 border-r border-gray-100">{i+1}</td>
                              <td className="px-2 py-1.5 font-bold border-r border-gray-100">{e.branch}</td>
                              <td className="px-2 py-1.5 text-gray-500 border-r border-gray-100 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("en-GH",{dateStyle:"short"})}</td>
                              <td className="px-2 py-1.5 font-black border-r border-gray-100">{GHS(e.totalAmount)}</td>
                              <td className="px-2 py-1.5 text-[#059669] border-r border-gray-100">{GHS(e.totalCash)}</td>
                              <td className="px-2 py-1.5 text-[#2563eb] border-r border-gray-100">{GHS(e.totalMomo)}</td>
                              <td className="px-2 py-1.5 text-[#4f46e5] border-r border-gray-100">{GHS(e.totalBank??0)}</td>
                              <td className="px-2 py-1.5 text-[#dc2626] border-r border-gray-100">{GHS(e.totalCredit)}</td>
                              <td className="px-2 py-1.5 text-[#7c3aed] border-r border-gray-100">{GHS(e.totalProfit)}</td>
                              <td className="px-2 py-1.5 text-gray-500">{pct(e.totalProfit,e.totalAmount)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <button onClick={()=>{setDone(true);setTimeout(onClose,2200);}}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white hover:opacity-90 transition-all ${type==="pdf"?"bg-red-600":"bg-[#1d6f42]"}`}>
                  <Download className="h-4 w-4"/> Download {type==="pdf"?"PDF":"Excel"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export default function HistoryPage() {
  const { data: allEntries = [], isLoading } = useListEntries();
  const [period, setPeriod]       = useState<Period>("This Month");
  const [branchFilter, setBranch] = useState("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportModal, setExportModal] = useState<"pdf"|"excel"|null>(null);

  const filtered = useMemo(() => {
    const byPeriod = filterByPeriod(allEntries, period);
    return branchFilter === "All" ? byPeriod : byPeriod.filter(e => e.branch === branchFilter);
  }, [allEntries, period, branchFilter]);

  const sorted = useMemo(() =>
    [...filtered].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filtered]
  );

  const totalSales  = filtered.reduce((s,e) => s + e.totalAmount, 0);
  const totalProfit = filtered.reduce((s,e) => s + e.totalProfit, 0);
  const margin      = pct(totalProfit, totalSales);

  return (
    <div className="p-6 space-y-5 max-w-3xl" data-testid="page-history">

      {exportModal && (
        <ExportModal
          type={exportModal} entries={sorted}
          branchFilter={branchFilter} period={period}
          onClose={() => setExportModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">History</h1>
          <p className="text-sm text-muted-foreground">{sorted.length} entr{sorted.length !== 1 ? "ies" : "y"} · {GHS(totalSales)} · {margin}% margin</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExportModal("pdf")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all">
            <FileText className="h-3.5 w-3.5 text-red-500"/> PDF
          </button>
          <button onClick={() => setExportModal("excel")}
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground hover:bg-muted/70 transition-all">
            <Table2 className="h-3.5 w-3.5 text-emerald-500"/> Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            {p}
          </button>
        ))}
        <span className="self-center text-border">|</span>
        {BRANCH_FILTERS.map(b => (
          <button key={b} onClick={() => setBranch(b)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${branchFilter === b ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            {b}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl"/>)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <p className="font-bold text-muted-foreground">No entries for this period.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Try a wider period or different branch.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(e => {
            const c  = BRANCH_COLORS[e.branch] ?? BRANCH_COLORS["Adenta"];
            const em = pct(e.totalProfit, e.totalAmount);
            const open = expandedId === e.id;

            return (
              <div key={e.id} className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-all ${open ? "border-primary/40" : "border-border"}`}>

                {/* Row */}
                <button
                  onClick={() => setExpandedId(open ? null : e.id)}
                  className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-4 hover:bg-muted/20 transition-colors"
                >
                  {/* Branch badge */}
                  <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shrink-0 ${c.bg} ${c.border}`}>
                    <span className="h-2 w-2 rounded-full" style={{background: c.dot}}/>
                    <span className={`text-xs font-black ${c.text}`}>{e.branch}</span>
                  </div>

                  {/* Date + time */}
                  <div className="shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {new Date(e.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(e.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1"/>

                  {/* Items + margin */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-muted-foreground">{e.itemsSold} items</p>
                    <p className={`text-xs font-bold ${em >= 20 ? "text-emerald-600" : em >= 10 ? "text-amber-600" : "text-red-500"}`}>{em}% margin</p>
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-foreground">{GHS(e.totalAmount)}</p>
                    <p className="text-xs text-purple-600 font-bold">+{GHS(e.totalProfit)}</p>
                  </div>

                  {/* Status */}
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">{e.status}</span>

                  {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0"/> : <ChevronDown className="h-4 w-4 text-muted-foreground/40 shrink-0"/>}
                </button>

                {/* Expanded detail */}
                {open && (
                  <div className="border-t border-border px-5 py-4 bg-muted/10">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                      {[
                        { label: "Cash",   value: GHS(e.totalCash),        color: "text-emerald-600" },
                        { label: "MoMo",   value: GHS(e.totalMomo),        color: "text-blue-600" },
                        { label: "Bank",   value: GHS(e.totalBank ?? 0),   color: "text-indigo-600" },
                        { label: "Credit", value: GHS(e.totalCredit),      color: "text-red-600" },
                        { label: "Profit", value: GHS(e.totalProfit),      color: "text-purple-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                          <p className={`text-base font-black mt-1 ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {e.totalCredit > 0 && e.creditCustomer && (
                      <p className="mt-3 text-xs text-red-600 font-bold">Credit customer: {e.creditCustomer}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
