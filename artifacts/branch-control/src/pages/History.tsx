import { useMemo, useState } from "react";
import { useListEntries, useGetEntryItems } from "@workspace/api-client-react";
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

const BRANCH_COLORS: Record<string, string> = {
  Adenta:  "text-blue-600",
  Spintex: "text-purple-600",
  Kasoa:   "text-amber-600",
};

const PAY_COLORS: Record<string, string> = {
  Cash:   "bg-emerald-100 text-emerald-700",
  MoMo:   "bg-blue-100 text-blue-700",
  Bank:   "bg-indigo-100 text-indigo-700",
  Credit: "bg-red-100 text-red-700",
  Split:  "bg-amber-100 text-amber-700",
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

/* ── Expandable items sub-table ────────────────────────── */
function EntryItemsTable({ entryId }: { entryId: number }) {
  const { data: items, isLoading } = useGetEntryItems(entryId);

  if (isLoading) return (
    <div className="p-4 space-y-2">
      {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg"/>)}
    </div>
  );

  if (!items || items.length === 0) return (
    <div className="px-6 py-4 text-sm text-muted-foreground italic">
      No line items recorded for this entry.
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Code</th>
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Product</th>
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Price</th>
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Qty Sold</th>
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Amount</th>
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Payment</th>
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Customer</th>
            <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-muted-foreground">Phone</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const profit = (item.price - item.cost) * item.qty;
            return (
              <tr key={item.id} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                <td className="px-4 py-2.5 font-mono font-bold text-muted-foreground">{item.productCode}</td>
                <td className="px-4 py-2.5 font-bold text-foreground whitespace-nowrap">{item.productName}</td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{GHS(item.price)} / {item.unit || "unit"}</td>
                <td className="px-4 py-2.5 font-black text-foreground text-center">{item.qty}</td>
                <td className="px-4 py-2.5 font-black text-foreground whitespace-nowrap">{GHS(item.amount)}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${PAY_COLORS[item.paymentMethod] ?? "bg-muted text-muted-foreground"}`}>
                    {item.paymentMethod}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.customerName || <span className="text-muted-foreground/30">—</span>}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{item.customerPhone || <span className="text-muted-foreground/30">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-primary/20 bg-primary/5">
            <td className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground" colSpan={3}>
              {items.length} line{items.length !== 1 ? "s" : ""}
            </td>
            <td className="px-4 py-2.5 font-black text-foreground text-center">
              {items.reduce((s, it) => s + it.qty, 0)}
            </td>
            <td className="px-4 py-2.5 font-black text-foreground whitespace-nowrap">
              {GHS(items.reduce((s, it) => s + it.amount, 0))}
            </td>
            <td colSpan={3} className="px-4 py-2.5 text-xs text-purple-600 font-bold">
              Profit {GHS(items.reduce((s, it) => s + (it.price - it.cost) * it.qty, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
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
              <motion.div key="done" initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}} className="flex flex-col items-center py-14">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600"/>
                </div>
                <p className="text-lg font-black text-foreground">Export Ready</p>
                <p className="text-sm text-muted-foreground mt-1">{fname}</p>
              </motion.div>
            ) : (
              <motion.div key="preview" className="p-4 space-y-4">
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
    const byBranch = branchFilter === "All" ? byPeriod : byPeriod.filter(e => e.branch === branchFilter);
    return [...byBranch].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allEntries, period, branchFilter]);

  const totalSales  = filtered.reduce((s,e) => s + e.totalAmount, 0);
  const totalProfit = filtered.reduce((s,e) => s + e.totalProfit, 0);
  const totalCash   = filtered.reduce((s,e) => s + e.totalCash, 0);
  const totalMomo   = filtered.reduce((s,e) => s + e.totalMomo, 0);
  const totalBank   = filtered.reduce((s,e) => s + (e.totalBank??0), 0);
  const totalCredit = filtered.reduce((s,e) => s + e.totalCredit, 0);
  const totalItems  = filtered.reduce((s,e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  return (
    <div className="p-6 space-y-5 max-w-6xl" data-testid="page-history">

      {exportModal && (
        <ExportModal
          type={exportModal} entries={filtered}
          branchFilter={branchFilter} period={period}
          onClose={() => setExportModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">History</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} entr{filtered.length !== 1 ? "ies" : "y"} · {GHS(totalSales)} · {margin}% margin</p>
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

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-bold text-muted-foreground">No entries for this period.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try a wider period or different branch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 w-8"/>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Branch</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cash</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">MoMo</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bank</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Credit</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profit</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margin</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Items</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const em   = pct(e.totalProfit, e.totalAmount);
                  const bc   = BRANCH_COLORS[e.branch] ?? "text-foreground";
                  const open = expandedId === e.id;
                  return (
                    <>
                      <tr
                        key={e.id}
                        onClick={() => setExpandedId(open ? null : e.id)}
                        className={`border-b border-border/50 cursor-pointer transition-colors ${open ? "bg-primary/5" : i % 2 === 0 ? "hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"}`}
                      >
                        <td className="px-4 py-3">
                          {open
                            ? <ChevronUp className="h-4 w-4 text-primary"/>
                            : <ChevronDown className="h-4 w-4 text-muted-foreground/40"/>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{filtered.length - i}</td>
                        <td className="px-4 py-3">
                          <span className={`font-black text-sm ${bc}`}>{e.branch}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-bold text-foreground">{new Date(e.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}</p>
                        </td>
                        <td className="px-4 py-3 font-black text-foreground whitespace-nowrap">{GHS(e.totalAmount)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 whitespace-nowrap">{e.totalCash > 0 ? GHS(e.totalCash) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 font-bold text-blue-600 whitespace-nowrap">{e.totalMomo > 0 ? GHS(e.totalMomo) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600 whitespace-nowrap">{(e.totalBank??0) > 0 ? GHS(e.totalBank) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 font-bold text-red-600 whitespace-nowrap">{e.totalCredit > 0 ? GHS(e.totalCredit) : <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-4 py-3 font-bold text-purple-600 whitespace-nowrap">{GHS(e.totalProfit)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${em >= 20 ? "bg-emerald-100 text-emerald-700" : em >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {em}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{e.itemsSold}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{e.status}</span>
                        </td>
                      </tr>

                      {/* ── Expanded line items ── */}
                      {open && (
                        <tr key={`${e.id}-items`} className="border-b border-border bg-muted/5">
                          <td colSpan={13} className="p-0">
                            <div className="border-t border-border/60">
                              <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Line Items — {e.branch} · {new Date(e.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                                </span>
                              </div>
                              <EntryItemsTable entryId={e.id} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-primary/5 font-black">
                  <td className="px-4 py-3" colSpan={4}>
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Totals · {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{GHS(totalSales)}</td>
                  <td className="px-4 py-3 text-emerald-600 whitespace-nowrap">{GHS(totalCash)}</td>
                  <td className="px-4 py-3 text-blue-600 whitespace-nowrap">{GHS(totalMomo)}</td>
                  <td className="px-4 py-3 text-indigo-600 whitespace-nowrap">{GHS(totalBank)}</td>
                  <td className="px-4 py-3 text-red-600 whitespace-nowrap">{GHS(totalCredit)}</td>
                  <td className="px-4 py-3 text-purple-600 whitespace-nowrap">{GHS(totalProfit)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${Number(margin) >= 20 ? "bg-emerald-100 text-emerald-700" : Number(margin) >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{totalItems}</td>
                  <td className="px-4 py-3"/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
