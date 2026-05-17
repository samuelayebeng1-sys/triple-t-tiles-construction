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

const BRANCH_DOT: Record<string, string> = {
  Adenta:  "bg-blue-500",
  Spintex: "bg-violet-500",
  Kasoa:   "bg-amber-500",
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

/* ── Payment breakdown pills in one cell ─────────────── */
function PayBreakdown({ cash, momo, bank, credit }: { cash: number; momo: number; bank: number; credit: number }) {
  const parts: { label: string; val: number; cls: string }[] = [
    { label: "Cash",   val: cash,   cls: "bg-emerald-100 text-emerald-700" },
    { label: "MoMo",   val: momo,   cls: "bg-blue-100 text-blue-700" },
    { label: "Bank",   val: bank,   cls: "bg-indigo-100 text-indigo-700" },
    { label: "Credit", val: credit, cls: "bg-red-100 text-red-700" },
  ].filter(p => p.val > 0);

  if (parts.length === 0) return <span className="text-muted-foreground/40">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map(p => (
        <span key={p.label} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${p.cls}`}>
          {p.label} {GHS(p.val)}
        </span>
      ))}
    </div>
  );
}

/* ── Expandable line items sub-table ────────────────────── */
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
          <tr className="bg-muted/40 border-b border-border">
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Code</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Product</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Price</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Qty</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Amount</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Payment</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Customer</th>
            <th className="px-4 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">Phone</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className={`border-b border-border/40 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
              <td className="px-4 py-2 font-mono text-muted-foreground">{item.productCode}</td>
              <td className="px-4 py-2 font-bold text-foreground whitespace-nowrap">{item.productName}</td>
              <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{GHS(item.price)}/{item.unit || "unit"}</td>
              <td className="px-4 py-2 font-black text-foreground text-center">{item.qty}</td>
              <td className="px-4 py-2 font-bold text-foreground whitespace-nowrap">{GHS(item.amount)}</td>
              <td className="px-4 py-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${PAY_COLORS[item.paymentMethod] ?? "bg-muted text-muted-foreground"}`}>
                  {item.paymentMethod}
                </span>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{item.customerName || <span className="text-muted-foreground/30">—</span>}</td>
              <td className="px-4 py-2 text-muted-foreground">{item.customerPhone || <span className="text-muted-foreground/30">—</span>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/20">
            <td className="px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest" colSpan={3}>
              {items.length} product{items.length !== 1 ? "s" : ""}
            </td>
            <td className="px-4 py-2 font-black text-foreground text-center">
              {items.reduce((s, it) => s + it.qty, 0)}
            </td>
            <td className="px-4 py-2 font-black text-foreground whitespace-nowrap">
              {GHS(items.reduce((s, it) => s + it.amount, 0))}
            </td>
            <td colSpan={3} className="px-4 py-2 text-xs font-bold text-emerald-600">
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
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${type==="pdf"?"bg-red-100":"bg-emerald-100"}`}>
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
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
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
                  <div className="overflow-auto max-h-52">
                    <table className="w-full">
                      <thead><tr className="bg-gray-50 border-b border-gray-100">
                        {["Branch","Date","Total Sales","Profit","Margin","Items"].map(h=>(
                          <th key={h} className="px-3 py-1.5 text-left text-[8px] font-black uppercase text-gray-400">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {entries.map((e,i)=>(
                          <tr key={e.id} className={i%2===0?"bg-white":"bg-gray-50/50"}>
                            <td className="px-3 py-1.5 font-bold">{e.branch}</td>
                            <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString("en-GH",{dateStyle:"short"})}</td>
                            <td className="px-3 py-1.5 font-black">{GHS(e.totalAmount)}</td>
                            <td className="px-3 py-1.5 text-[#059669]">{GHS(e.totalProfit)}</td>
                            <td className="px-3 py-1.5 text-gray-500">{pct(e.totalProfit,e.totalAmount)}%</td>
                            <td className="px-3 py-1.5 text-gray-500">{e.itemsSold}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="bg-gray-100 border-t-2 border-gray-200 font-black text-[10px]">
                        <td className="px-3 py-1.5 text-gray-700" colSpan={2}>TOTAL ({entries.length})</td>
                        <td className="px-3 py-1.5">{GHS(total)}</td>
                        <td className="px-3 py-1.5 text-[#059669]">{GHS(profit)}</td>
                        <td className="px-3 py-1.5 text-gray-500">{pct(profit,total)}%</td>
                        <td className="px-3 py-1.5 text-gray-500">{entries.reduce((s,e)=>s+e.itemsSold,0)}</td>
                      </tr></tfoot>
                    </table>
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
  const [period, setPeriod]         = useState<Period>("This Month");
  const [branchFilter, setBranch]   = useState("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportModal, setExportModal] = useState<"pdf"|"excel"|null>(null);

  const filtered = useMemo(() => {
    const byPeriod = filterByPeriod(allEntries, period);
    const byBranch = branchFilter === "All" ? byPeriod : byPeriod.filter(e => e.branch === branchFilter);
    return [...byBranch].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allEntries, period, branchFilter]);

  const totalSales  = filtered.reduce((s,e) => s + e.totalAmount, 0);
  const totalProfit = filtered.reduce((s,e) => s + e.totalProfit, 0);
  const totalItems  = filtered.reduce((s,e) => s + e.itemsSold, 0);
  const margin      = pct(totalProfit, totalSales);

  return (
    <div className="p-6 space-y-5 max-w-5xl" data-testid="page-history">

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
          <p className="text-sm text-muted-foreground">
            {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"} · {GHS(totalSales)} · {margin}% margin
          </p>
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
        <span className="self-center text-border mx-1">|</span>
        {BRANCH_FILTERS.map(b => (
          <button key={b} onClick={() => setBranch(b)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${branchFilter === b ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            {b}
          </button>
        ))}
      </div>

      {/* Totals strip */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Sales", value: GHS(totalSales) },
            { label: "Total Profit", value: GHS(totalProfit), green: true },
            { label: "Items Sold",   value: String(totalItems) },
          ].map(({ label, value, green }) => (
            <div key={label} className="rounded-2xl border border-border bg-card px-5 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`text-xl font-black mt-1 ${green ? "text-emerald-600" : "text-foreground"}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Entry list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="font-bold text-muted-foreground">No entries for this period.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Try a wider period or different branch.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const dot  = BRANCH_DOT[e.branch] ?? "bg-muted-foreground";
            const open = expandedId === e.id;
            return (
              <div key={e.id} className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-all ${open ? "border-primary/30" : "border-border"}`}>

                {/* Summary row — click to toggle */}
                <button
                  onClick={() => setExpandedId(open ? null : e.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                >
                  {/* Branch dot + name */}
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dot}`}/>
                    <span className="font-black text-foreground">{e.branch}</span>
                  </div>

                  {/* Date */}
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {new Date(e.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(e.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="w-28 shrink-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</p>
                    <p className="text-sm font-black text-foreground">{GHS(e.totalAmount)}</p>
                  </div>

                  {/* Profit */}
                  <div className="w-28 shrink-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profit</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {GHS(e.totalProfit)}
                      <span className="ml-1 text-[10px] text-muted-foreground">{pct(e.totalProfit, e.totalAmount)}%</span>
                    </p>
                  </div>

                  {/* Payment pills — grows to fill space */}
                  <div className="flex-1 min-w-0">
                    <PayBreakdown
                      cash={e.totalCash} momo={e.totalMomo}
                      bank={e.totalBank ?? 0} credit={e.totalCredit}
                    />
                  </div>

                  {/* Items + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{e.itemsSold} items</span>
                    {open
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground"/>
                      : <ChevronDown className="h-4 w-4 text-muted-foreground/40"/>}
                  </div>
                </button>

                {/* Expanded line items */}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="items"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mx-5 mb-5 rounded-xl border border-border overflow-hidden">
                        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${dot}`}/>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Line Items · {new Date(e.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}
                          </span>
                        </div>
                        <EntryItemsTable entryId={e.id} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
