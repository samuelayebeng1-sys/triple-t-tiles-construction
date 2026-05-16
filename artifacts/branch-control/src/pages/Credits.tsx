import { useState } from "react";
import { useListCredits, useGetCreditsSummary, useRecordPayment, useCreateCredit, getListCreditsQueryKey, getGetCreditsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GHS, pct } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Filter = "All" | "Outstanding" | "Settled";

export default function Credits() {
  const [filter, setFilter] = useState<Filter>("All");
  const [paymentMap, setPaymentMap] = useState<Record<number, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCredit, setNewCredit] = useState({ name: "", phone: "", total: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: credits, isLoading } = useListCredits({ query: { queryKey: getListCreditsQueryKey() } });
  const { data: summary } = useGetCreditsSummary({ query: { queryKey: getGetCreditsSummaryQueryKey() } });
  const recordPayment = useRecordPayment();
  const createCredit = useCreateCredit();

  const filtered = (credits ?? []).filter(c => {
    const balance = c.total - c.paid;
    if (filter === "Outstanding") return balance > 0;
    if (filter === "Settled") return balance <= 0;
    return true;
  });

  function handlePayment(id: number) {
    const amt = Number(paymentMap[id] || 0);
    if (!amt) return;
    recordPayment.mutate({ id, data: { amount: amt } }, {
      onSuccess: (updated) => {
        qc.invalidateQueries({ queryKey: getListCreditsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCreditsSummaryQueryKey() });
        toast({ title: "Payment recorded", description: `${GHS(amt)} recorded for ${updated.name}` });
        setPaymentMap(m => ({ ...m, [id]: "" }));
      }
    });
  }

  function handleAddCredit() {
    if (!newCredit.name || !newCredit.total) return;
    createCredit.mutate({ data: { name: newCredit.name, phone: newCredit.phone, total: Number(newCredit.total) } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCreditsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCreditsSummaryQueryKey() });
        toast({ title: "Credit added", description: `${newCredit.name} added to credit book` });
        setNewCredit({ name: "", phone: "", total: "" });
        setShowAddForm(false);
      }
    });
  }

  const inputClass = "rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary w-full";

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-credits">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Credit Book</h1>
          <p className="text-sm text-muted-foreground">Track customer credit and payment history</p>
        </div>
        <button
          data-testid="button-add-credit"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90 transition-all"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancel" : "Add Credit"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Total Credit Issued", value: GHS(summary?.totalIssued ?? 0), color: "text-foreground" },
          { label: "Amount Collected", value: GHS(summary?.totalPaid ?? 0), color: "text-emerald-600" },
          { label: "Outstanding Balance", value: GHS(summary?.outstanding ?? 0), color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`} data-testid={`credit-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="font-black text-foreground mb-4">New Credit Entry</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Customer Name</label>
              <input data-testid="input-credit-name" value={newCredit.name} onChange={e => setNewCredit(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className={inputClass} />
            </div>
            <div>
              <label className="block mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Phone</label>
              <input data-testid="input-credit-phone" value={newCredit.phone} onChange={e => setNewCredit(f => ({ ...f, phone: e.target.value }))} placeholder="024 XXX XXXX" className={inputClass} />
            </div>
            <div>
              <label className="block mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Total Amount (GH₵)</label>
              <input data-testid="input-credit-total" type="number" value={newCredit.total} onChange={e => setNewCredit(f => ({ ...f, total: e.target.value }))} placeholder="e.g. 5000" className={inputClass} />
            </div>
          </div>
          <button data-testid="button-save-credit" onClick={handleAddCredit} disabled={createCredit.isPending}
            className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
            Save Credit Entry
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(["All", "Outstanding", "Settled"] as Filter[]).map(f => (
          <button
            key={f}
            data-testid={`filter-${f.toLowerCase()}`}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${filter === f ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Credits list */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No credit entries found.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(c => {
            const balance = c.total - c.paid;
            const settled = balance <= 0;
            const progress = pct(c.paid, c.total);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card shadow-sm p-5" data-testid={`card-credit-${c.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-sm font-black text-foreground">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-foreground text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${settled ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {settled ? "Settled" : "Owing"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
                  <div className="rounded-xl bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground font-bold">Total</p>
                    <p className="font-black text-foreground">{GHS(c.total)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground font-bold">Paid</p>
                    <p className="font-black text-emerald-600">{GHS(c.paid)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground font-bold">Balance</p>
                    <p className={`font-black ${settled ? "text-emerald-600" : "text-red-600"}`}>{GHS(balance)}</p>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                  <div className={`h-full rounded-full transition-all ${settled ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Since {new Date(c.createdAt).toLocaleDateString("en-GH", { dateStyle: "medium" })}</p>

                {!settled && (
                  <div className="mt-3 flex gap-2">
                    <input
                      data-testid={`input-payment-${c.id}`}
                      value={paymentMap[c.id] ?? ""}
                      onChange={e => setPaymentMap(m => ({ ...m, [c.id]: e.target.value }))}
                      placeholder="Enter amount..."
                      type="number"
                      className="flex-1 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 focus:bg-background"
                    />
                    <button
                      data-testid={`button-record-payment-${c.id}`}
                      onClick={() => handlePayment(c.id)}
                      disabled={!paymentMap[c.id] || recordPayment.isPending}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      Record
                    </button>
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
