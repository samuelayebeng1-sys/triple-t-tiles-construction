import { useState, useEffect } from "react";
import { useGetStock, useListProducts, useCreateTransfer, useCreateDelivery, useListSuppliers, getGetStockQueryKey, getListCreditsQueryKey, getGetCreditsSummaryQueryKey, useCreateCredit } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GHS, WAREHOUSES, LOCATIONS } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Package, ArrowRight, Truck, ShoppingCart, Plus, Minus } from "lucide-react";

type Tab = "overview" | "receive" | "transfer" | "directSale";

export default function Warehouses() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: products } = useListProducts();
  const { data: stock } = useGetStock({ query: { queryKey: getGetStockQueryKey() } });
  const { data: suppliers } = useListSuppliers();
  const createTransfer = useCreateTransfer();
  const createDelivery = useCreateDelivery();
  const createCredit = useCreateCredit();

  const [tab, setTab] = useState<Tab>("overview");
  const [receiveWarehouse, setReceiveWarehouse] = useState("Main Warehouse");
  const [receiveSupplier, setReceiveSupplier] = useState("");
  const [addQtys, setAddQtys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [transferForm, setTransferForm] = useState({ from: "Main Warehouse", to: "Spintex", code: "CEM-50", qty: "" });
  const [saleForm, setSaleForm] = useState({ location: "Main Warehouse", code: "CEM-50", qty: "", pay: "Cash", customer: "", phone: "", paid: "" });

  const supplierNames = (suppliers ?? []).map(s => s.name);
  const allSuppliers = supplierNames.length > 0 ? supplierNames : ["Dangote Cement", "Diamond Cement", "Buildmart Ghana"];

  function getStockQty(location: string, code: string) {
    return stock?.find(s => s.location === location && s.productCode === code)?.quantity ?? 0;
  }

  function newTotal(code: string) {
    return getStockQty(receiveWarehouse, code) + Number(addQtys[code] || 0);
  }

  async function handleReceiveAll() {
    const entries = Object.entries(addQtys).filter(([, v]) => Number(v) > 0);
    if (!entries.length) { toast({ title: "Nothing to add", description: "Enter quantities in the table first." }); return; }
    setSaving(true);
    for (const [code, qty] of entries) {
      await createDelivery.mutateAsync({
        data: { warehouse: receiveWarehouse, productCode: code, quantity: Number(qty), supplier: receiveSupplier || "Unknown" }
      }).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
    toast({ title: "Stock received", description: `${entries.length} product(s) added to ${receiveWarehouse}.` });
    setAddQtys({});
    setSaving(false);
  }

  function handleTransfer() {
    const qty = Number(transferForm.qty);
    if (!qty || transferForm.from === transferForm.to) return;
    createTransfer.mutate({
      data: { fromLocation: transferForm.from, toLocation: transferForm.to, productCode: transferForm.code, quantity: qty }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
        toast({ title: "Transfer done", description: `${qty}x ${transferForm.code}: ${transferForm.from} → ${transferForm.to}` });
        setTransferForm(f => ({ ...f, qty: "" }));
      }
    });
  }

  async function handleDirectSale() {
    const qty = Number(saleForm.qty);
    if (!qty) return;
    const p = products?.find(x => x.code === saleForm.code);
    if (!p) return;
    const amount = qty * p.price;
    const currentQty = getStockQty(saleForm.location, saleForm.code);
    try {
      await fetch("/api/stock/adjust", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: saleForm.location, productCode: saleForm.code, quantity: Math.max(0, currentQty - qty) }),
      });
      if ((saleForm.pay === "Credit" || saleForm.pay === "Split") && saleForm.customer) {
        const creditAmt = saleForm.pay === "Credit" ? amount : Math.max(0, amount - Number(saleForm.paid || 0));
        if (creditAmt > 0) {
          await createCredit.mutateAsync({ data: { name: saleForm.customer, phone: saleForm.phone || "", total: creditAmt } }).catch(() => {});
          qc.invalidateQueries({ queryKey: getListCreditsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetCreditsSummaryQueryKey() });
        }
      }
      qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
      toast({ title: "Sale recorded", description: `${qty}x ${p.name} from ${saleForm.location} · ${GHS(amount)}` });
      setSaleForm(f => ({ ...f, qty: "", customer: "", phone: "", paid: "" }));
    } catch { toast({ title: "Error", description: "Could not complete sale", variant: "destructive" }); }
  }

  const selectClass = "rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary w-full";
  const inputClass = "rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary w-full";
  const labelClass = "block mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground";

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Package },
    { id: "receive", label: "Receive Stock", icon: Truck },
    { id: "transfer", label: "Transfer", icon: ArrowRight },
    { id: "directSale", label: "Direct Sale", icon: ShoppingCart },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-warehouses">
      <div>
        <h1 className="text-2xl font-black text-foreground">Warehouses</h1>
        <p className="text-sm text-muted-foreground">Stock overview, receive deliveries, transfer, and direct sales</p>
      </div>

      <div className="flex gap-2 flex-wrap border-b border-border pb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} data-testid={`tab-${id}`} onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${tab === id ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          {WAREHOUSES.map(w => {
            const totalVal = products?.reduce((s, p) => s + p.cost * getStockQty(w, p.code), 0) ?? 0;
            const totalUnits = products?.reduce((s, p) => s + getStockQty(w, p.code), 0) ?? 0;
            const lowCount = products?.filter(p => getStockQty(w, p.code) <= 5).length ?? 0;
            return (
              <div key={w} className="rounded-2xl border border-border bg-card shadow-sm p-6" data-testid={`card-warehouse-${w.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-start justify-between mb-4">
                  <div><h2 className="text-xl font-black text-foreground">{w}</h2><p className="text-xs text-muted-foreground mt-0.5">Storage facility</p></div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lowCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {lowCount > 0 ? `${lowCount} low` : "Stocked"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Stock Value</p>
                    <p className="mt-1.5 text-lg font-black text-foreground">{GHS(totalVal)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Units</p>
                    <p className="mt-1.5 text-lg font-black text-foreground">{totalUnits.toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-3 border-t border-border">
                  {products?.map(p => {
                    const qty = getStockQty(w, p.code);
                    return (
                      <div key={p.code} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-semibold">{p.name}</span>
                        <span className={`font-black ${qty <= 5 ? "text-red-600" : "text-foreground"}`}>{qty} <span className="font-normal text-xs text-muted-foreground">{p.unit}</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Receive Stock (simplified table) ── */}
      {tab === "receive" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-xl font-black text-foreground mb-1">Receive New Stock</h2>
          <p className="text-sm text-muted-foreground mb-5">Type how many you're adding — the new total updates instantly</p>

          <div className="grid gap-4 md:grid-cols-2 mb-5">
            <div>
              <label className={labelClass}>Receiving Warehouse</label>
              <select data-testid="select-receive-warehouse" value={receiveWarehouse} onChange={e => setReceiveWarehouse(e.target.value)} className={selectClass}>
                {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Supplier (optional)</label>
              <select data-testid="select-receive-supplier" value={receiveSupplier} onChange={e => setReceiveSupplier(e.target.value)} className={selectClass}>
                <option value="">Select supplier...</option>
                {allSuppliers.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Simple stock-in table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Unit</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Current Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Adding</th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">New Total</th>
                </tr>
              </thead>
              <tbody>
                {(products ?? []).map(p => {
                  const current = getStockQty(receiveWarehouse, p.code);
                  const adding = Number(addQtys[p.code] || 0);
                  const total = current + adding;
                  return (
                    <tr key={p.code} className={`border-t border-border/60 transition-colors ${adding > 0 ? "bg-emerald-50/60 dark:bg-emerald-950/20" : "hover:bg-muted/30"}`}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-muted-foreground">{p.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-black text-lg ${current <= 5 ? "text-red-600" : "text-foreground"}`}>{current}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setAddQtys(m => ({ ...m, [p.code]: String(Math.max(0, (Number(m[p.code] || 0)) - 1)) }))}
                            className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            data-testid={`input-receive-${p.code}`}
                            type="number" min="0"
                            value={addQtys[p.code] || ""}
                            onChange={e => setAddQtys(m => ({ ...m, [p.code]: e.target.value }))}
                            placeholder="0"
                            className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm font-black outline-none focus:border-primary"
                          />
                          <button onClick={() => setAddQtys(m => ({ ...m, [p.code]: String((Number(m[p.code] || 0)) + 1) }))}
                            className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-black transition-colors ${adding > 0 ? "text-emerald-600" : "text-muted-foreground/50"}`}>
                          {adding > 0 ? total : "—"}
                        </span>
                        {adding > 0 && <p className="text-[10px] text-emerald-600 font-bold">+{adding}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {Object.values(addQtys).filter(v => Number(v) > 0).length} product(s) · {Object.values(addQtys).reduce((s, v) => s + Number(v || 0), 0)} units total
            </p>
            <button data-testid="button-save-delivery" onClick={handleReceiveAll} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50">
              <Plus className="h-4 w-4" /> {saving ? "Saving..." : "Add to Warehouse"}
            </button>
          </div>
        </div>
      )}

      {/* ── Transfer ── */}
      {tab === "transfer" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-xl font-black text-foreground mb-1">Transfer Stock</h2>
          <p className="text-sm text-muted-foreground mb-5">Move items between any two locations</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>From</label>
              <select data-testid="select-transfer-from" value={transferForm.from} onChange={e => setTransferForm(f => ({ ...f, from: e.target.value }))} className={selectClass}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>To</label>
              <select data-testid="select-transfer-to" value={transferForm.to} onChange={e => setTransferForm(f => ({ ...f, to: e.target.value }))} className={selectClass}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Product</label>
              <select data-testid="select-transfer-product" value={transferForm.code} onChange={e => setTransferForm(f => ({ ...f, code: e.target.value }))} className={selectClass}>
                {products?.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name} (Stk: {getStockQty(transferForm.from, p.code)})</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Quantity</label>
              <input data-testid="input-transfer-qty" type="number" value={transferForm.qty} onChange={e => setTransferForm(f => ({ ...f, qty: e.target.value }))} className={inputClass} placeholder="e.g. 20" />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button data-testid="button-transfer" onClick={handleTransfer} disabled={!transferForm.qty || transferForm.from === transferForm.to || createTransfer.isPending}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50">
              Transfer →
            </button>
            {transferForm.from === transferForm.to && <span className="text-xs text-red-500 font-bold">From and To must be different</span>}
          </div>
        </div>
      )}

      {/* ── Direct Sale ── */}
      {tab === "directSale" && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-xl font-black text-foreground mb-1">Warehouse Direct Sale</h2>
          <p className="text-sm text-muted-foreground mb-5">Record a sale directly from a warehouse — stock deducted immediately</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Location</label>
              <select value={saleForm.location} onChange={e => setSaleForm(f => ({ ...f, location: e.target.value }))} className={selectClass}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Product</label>
              <select value={saleForm.code} onChange={e => setSaleForm(f => ({ ...f, code: e.target.value }))} className={selectClass}>
                {products?.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name} (Stk: {getStockQty(saleForm.location, p.code)})</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Quantity</label>
              <input type="number" value={saleForm.qty} onChange={e => setSaleForm(f => ({ ...f, qty: e.target.value }))} className={inputClass} placeholder="e.g. 5" />
            </div>
            <div>
              <label className={labelClass}>Payment</label>
              <select value={saleForm.pay} onChange={e => setSaleForm(f => ({ ...f, pay: e.target.value }))} className={selectClass}>
                {["Cash", "MoMo", "Credit", "Split"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Customer Name</label>
              <input value={saleForm.customer} onChange={e => setSaleForm(f => ({ ...f, customer: e.target.value }))} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input value={saleForm.phone} onChange={e => setSaleForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="024 XXX XXXX" />
            </div>
            {saleForm.pay === "Split" && (
              <div>
                <label className={labelClass}>Amount Paid Now</label>
                <input type="number" value={saleForm.paid} onChange={e => setSaleForm(f => ({ ...f, paid: e.target.value }))} className={inputClass} />
              </div>
            )}
          </div>
          {saleForm.code && saleForm.qty && products && (
            <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-bold">{saleForm.qty}x {products.find(p => p.code === saleForm.code)?.name}</p>
              <p className="text-xl font-black">{GHS(Number(saleForm.qty) * (products.find(p => p.code === saleForm.code)?.price ?? 0))}</p>
            </div>
          )}
          <div className="mt-5">
            <button onClick={handleDirectSale} disabled={!saleForm.qty}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50">
              Record Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
