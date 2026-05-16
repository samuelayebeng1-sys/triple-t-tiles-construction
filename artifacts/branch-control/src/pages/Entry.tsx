import { useState, useMemo, useEffect } from "react";
import { useListProducts, useGetStock, useCreateEntry, useCreateCredit, getListEntriesQueryKey, getGetStockQueryKey, getGetDashboardQueryKey, getListCreditsQueryKey, getGetCreditsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GHS, BRANCHES, PAYMENT_METHODS } from "@/lib/format";
import { CheckCircle, Lock, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface EntryRow {
  code: string;
  sold: string;
  pay: string;
  customer: string;
  phone: string;
  paid: string;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-sm font-bold text-foreground">
          {time.toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <p className="text-lg font-black tabular-nums text-primary">
          {time.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function Entry() {
  const [selectedBranch, setSelectedBranch] = useState<string>(BRANCHES[0]);
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: products, isLoading: prodLoading } = useListProducts();
  const { data: stock } = useGetStock({ query: { queryKey: getGetStockQueryKey() } });
  const createEntry = useCreateEntry();
  const createCredit = useCreateCredit();

  const [rows, setRows] = useState<EntryRow[]>([]);
  const initialized = rows.length > 0;

  useMemo(() => {
    if (products && !initialized) {
      setRows(products.map(p => ({ code: p.code, sold: "", pay: "Cash", customer: "", phone: "", paid: "" })));
    }
  }, [products, initialized]);

  function update(i: number, k: keyof EntryRow, v: string) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  }

  function getStockQty(code: string): number {
    return stock?.find(s => s.location === selectedBranch && s.productCode === code)?.quantity ?? 0;
  }

  const totals = useMemo(() => {
    let cash = 0, momo = 0, bank = 0, credit = 0, profit = 0, items = 0;
    if (!products) return { cash, momo, bank, credit, total: 0, profit, items };
    rows.forEach(row => {
      const qty = Number(row.sold || 0);
      if (!qty) return;
      const p = products.find(p => p.code === row.code);
      if (!p) return;
      const amount = qty * p.price;
      items += qty;
      profit += qty * (p.price - p.cost);
      if (row.pay === "Cash") cash += amount;
      else if (row.pay === "MoMo") momo += amount;
      else if (row.pay === "Bank") bank += amount;
      else if (row.pay === "Credit") credit += amount;
      else if (row.pay === "Split") {
        const pd = Number(row.paid || 0);
        cash += pd;
        credit += Math.max(0, amount - pd);
      }
    });
    return { cash, momo, bank, credit, total: cash + momo + bank + credit, profit, items };
  }, [rows, products]);

  async function handleFinish() {
    if (totals.items === 0) {
      toast({ title: "No items sold", description: "Enter at least one quantity before finishing.", variant: "destructive" });
      return;
    }
    if (!confirmed) { setConfirmed(true); return; }

    const lines = rows
      .filter(r => Number(r.sold) > 0)
      .map(r => ({
        productCode: r.code,
        quantitySold: Number(r.sold),
        paymentMethod: r.pay,
        amountPaid: r.pay === "Split" ? Number(r.paid || 0) : null,
        customerName: r.customer || null,
        customerPhone: r.phone || null,
      }));

    // Auto-create credit book entries for Credit and Split rows
    const creditRows = rows.filter(r => Number(r.sold) > 0 && (r.pay === "Credit" || r.pay === "Split") && r.customer);
    for (const row of creditRows) {
      const p = products?.find(p => p.code === row.code);
      if (!p) continue;
      const qty = Number(row.sold);
      const amount = qty * p.price;
      const paid = (r: EntryRow) => r.pay === "Split" ? Number(r.paid || 0) : 0;
      const balance = row.pay === "Credit" ? amount : Math.max(0, amount - paid(row));
      if (balance > 0) {
        await createCredit.mutateAsync({
          data: { name: row.customer, phone: row.phone || "", total: balance }
        }).catch(() => {});
      }
    }

    createEntry.mutate({ data: { branch: selectedBranch, lines } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEntriesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        qc.invalidateQueries({ queryKey: getListCreditsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCreditsSummaryQueryKey() });
        toast({ title: "Entry saved & locked", description: `${selectedBranch} entry locked. Credit entries auto-added.` });
        setRows(products?.map(p => ({ code: p.code, sold: "", pay: "Cash", customer: "", phone: "", paid: "" })) ?? []);
        setConfirmed(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save entry. Try again.", variant: "destructive" });
        setConfirmed(false);
      }
    });
  }

  const needsCust = (pay: string) => pay === "Credit" || pay === "Split";

  return (
    <div className="p-6 space-y-6 max-w-full" data-testid="page-entry">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Sales Entry</h1>
          <div className="mt-1">
            <LiveClock />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Branch</span>
          {BRANCHES.map(b => (
            <button
              key={b}
              data-testid={`branch-${b.toLowerCase()}`}
              onClick={() => { setSelectedBranch(b); setConfirmed(false); }}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${selectedBranch === b ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{selectedBranch} — Recording now</p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 ml-2">Credit/Split sales auto-appear in Credit Book</p>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-entry">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Code", "Product", "Price", "Stock", "Qty Sold", "Amount", "Payment", "Customer Name", "Phone"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prodLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.map((row, i) => {
                const p = products?.find(x => x.code === row.code);
                if (!p) return null;
                const qty = Number(row.sold || 0);
                const amount = qty * p.price;
                const stockQty = getStockQty(row.code);
                const hasQty = qty > 0;
                const isCredit = needsCust(row.pay);
                return (
                  <tr key={row.code} className={`border-b border-border/50 transition-colors ${hasQty ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-muted px-2 py-1 text-xs font-black">{row.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground whitespace-nowrap">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">{GHS(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-black ${stockQty <= 5 ? "text-red-600" : "text-emerald-600"}`}>{stockQty}</span>
                      <span className="text-xs text-muted-foreground ml-1">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        data-testid={`input-qty-${row.code}`}
                        value={row.sold}
                        onChange={e => update(i, "sold", e.target.value)}
                        type="number" min="0"
                        className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-center font-black outline-none focus:border-primary text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 font-black whitespace-nowrap">
                      {hasQty ? GHS(amount) : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        data-testid={`select-pay-${row.code}`}
                        value={row.pay}
                        onChange={e => update(i, "pay", e.target.value)}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold outline-none focus:border-primary bg-background ${isCredit ? "border-amber-400" : "border-border"}`}
                      >
                        {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                      {row.pay === "Split" && (
                        <input
                          data-testid={`input-paid-${row.code}`}
                          value={row.paid}
                          onChange={e => update(i, "paid", e.target.value)}
                          placeholder="Cash paid"
                          className="mt-1.5 w-24 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        data-testid={`input-customer-${row.code}`}
                        value={row.customer}
                        onChange={e => update(i, "customer", e.target.value)}
                        placeholder={isCredit ? "Required" : "Optional"}
                        className={`w-32 rounded-lg border px-3 py-2 text-xs font-bold outline-none focus:border-primary bg-background ${isCredit && !row.customer && hasQty ? "border-amber-400" : "border-border"}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        data-testid={`input-phone-${row.code}`}
                        value={row.phone}
                        onChange={e => update(i, "phone", e.target.value)}
                        placeholder="024..."
                        className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Cash", value: GHS(totals.cash), color: "text-emerald-600" },
            { label: "MoMo", value: GHS(totals.momo), color: "text-blue-600" },
            { label: "Bank", value: GHS(totals.bank), color: "text-indigo-600" },
            { label: "Credit", value: GHS(totals.credit), color: "text-red-600" },
            { label: "Profit", value: GHS(totals.profit), color: "text-purple-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`mt-2 text-xl font-black ${color}`} data-testid={`total-${label.toLowerCase()}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Sale</p>
            <p className="text-3xl font-black text-foreground" data-testid="total-sale">{GHS(totals.total)}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{totals.items} items · {selectedBranch}</p>
          {totals.credit > 0 && (
            <div className="mb-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700">
              {GHS(totals.credit)} credit — will auto-add to Credit Book
            </div>
          )}
          {confirmed && (
            <div className="mb-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 px-4 py-3 text-xs font-bold text-amber-800">
              Confirm to lock this entry. This cannot be undone.
            </div>
          )}
          <button
            data-testid="button-finish-entry"
            onClick={handleFinish}
            disabled={createEntry.isPending}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black transition-all active:scale-[0.98] disabled:opacity-50 ${confirmed ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary hover:opacity-90 text-primary-foreground"}`}
          >
            {confirmed ? <><CheckCircle className="h-4 w-4" /> Confirm & Lock</> : <><Lock className="h-4 w-4" /> Finish Entry</>}
          </button>
        </div>
      </div>
    </div>
  );
}
