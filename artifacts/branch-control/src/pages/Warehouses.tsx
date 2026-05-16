import { useState } from "react";
import { useGetStock, useListProducts, useCreateTransfer, useCreateDelivery, getGetStockQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GHS, WAREHOUSES, LOCATIONS, SUPPLIERS } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function Warehouses() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: products } = useListProducts();
  const { data: stock } = useGetStock({ query: { queryKey: getGetStockQueryKey() } });
  const createTransfer = useCreateTransfer();
  const createDelivery = useCreateDelivery();

  const [receiveForm, setReceiveForm] = useState({ warehouse: "Main Warehouse", code: "CEM-50", qty: "", supplier: SUPPLIERS[0] });
  const [transferForm, setTransferForm] = useState({ from: "Main Warehouse", to: "Spintex", code: "CEM-50", qty: "" });

  function getStockQty(location: string, code: string) {
    return stock?.find(s => s.location === location && s.productCode === code)?.quantity ?? 0;
  }

  function handleReceive() {
    const qty = Number(receiveForm.qty);
    if (!qty) return;
    createDelivery.mutate({
      data: { warehouse: receiveForm.warehouse, productCode: receiveForm.code, quantity: qty, supplier: receiveForm.supplier }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
        toast({ title: "Stock received", description: `${qty}x ${receiveForm.code} added to ${receiveForm.warehouse}` });
        setReceiveForm(f => ({ ...f, qty: "" }));
      }
    });
  }

  function handleTransfer() {
    const qty = Number(transferForm.qty);
    if (!qty || transferForm.from === transferForm.to) return;
    createTransfer.mutate({
      data: { fromLocation: transferForm.from, toLocation: transferForm.to, productCode: transferForm.code, quantity: qty }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
        toast({ title: "Transfer complete", description: `${qty}x ${transferForm.code}: ${transferForm.from} → ${transferForm.to}` });
        setTransferForm(f => ({ ...f, qty: "" }));
      }
    });
  }

  const selectClass = "rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary w-full";
  const inputClass = "rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary w-full";
  const labelClass = "block mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground";

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-warehouses">
      <div>
        <h1 className="text-2xl font-black text-foreground">Warehouses</h1>
        <p className="text-sm text-muted-foreground">Manage incoming stock and inter-location transfers</p>
      </div>

      {/* Warehouse summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {WAREHOUSES.map(w => {
          const totalVal = products?.reduce((s, p) => s + p.cost * getStockQty(w, p.code), 0) ?? 0;
          const totalUnits = products?.reduce((s, p) => s + getStockQty(w, p.code), 0) ?? 0;
          const lowCount = products?.filter(p => getStockQty(w, p.code) <= 5).length ?? 0;
          return (
            <div key={w} className="rounded-2xl border border-border bg-card shadow-sm p-6" data-testid={`card-warehouse-${w.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black text-foreground">{w}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Primary storage facility</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lowCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {lowCount > 0 ? `${lowCount} low` : "Stocked"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Stock Value</p>
                  <p className="mt-1.5 text-lg font-black text-foreground" data-testid={`warehouse-value-${w.toLowerCase().replace(/\s+/g, "-")}`}>{GHS(totalVal)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Units</p>
                  <p className="mt-1.5 text-lg font-black text-foreground">{totalUnits.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                {products?.map(p => {
                  const qty = getStockQty(w, p.code);
                  return (
                    <div key={p.code} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-semibold">{p.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black ${qty <= 5 ? "text-red-600" : "text-foreground"}`}>{qty}</span>
                        <span className="text-xs text-muted-foreground">{p.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Receive stock */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h2 className="text-xl font-black text-foreground mb-1">Receive Stock from Supplier</h2>
        <p className="text-sm text-muted-foreground mb-5">Add newly delivered goods to a warehouse</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Warehouse</label>
            <select data-testid="select-receive-warehouse" value={receiveForm.warehouse} onChange={e => setReceiveForm(f => ({ ...f, warehouse: e.target.value }))} className={selectClass}>
              {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Product</label>
            <select data-testid="select-receive-product" value={receiveForm.code} onChange={e => setReceiveForm(f => ({ ...f, code: e.target.value }))} className={selectClass}>
              {products?.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input data-testid="input-receive-qty" type="number" value={receiveForm.qty} onChange={e => setReceiveForm(f => ({ ...f, qty: e.target.value }))} placeholder="e.g. 50" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Supplier</label>
            <select data-testid="select-receive-supplier" value={receiveForm.supplier} onChange={e => setReceiveForm(f => ({ ...f, supplier: e.target.value }))} className={selectClass}>
              {SUPPLIERS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5">
          <button data-testid="button-save-delivery" onClick={handleReceive} disabled={!receiveForm.qty || createDelivery.isPending}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50">
            Save Delivery
          </button>
        </div>
      </div>

      {/* Transfer */}
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
              {products?.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input data-testid="input-transfer-qty" type="number" value={transferForm.qty} onChange={e => setTransferForm(f => ({ ...f, qty: e.target.value }))} placeholder="e.g. 20" className={inputClass} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button data-testid="button-transfer" onClick={handleTransfer} disabled={!transferForm.qty || transferForm.from === transferForm.to || createTransfer.isPending}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50">
            Transfer →
          </button>
          {transferForm.from === transferForm.to && (
            <span className="text-xs text-red-500 font-bold">From and To must be different</span>
          )}
        </div>
      </div>
    </div>
  );
}
