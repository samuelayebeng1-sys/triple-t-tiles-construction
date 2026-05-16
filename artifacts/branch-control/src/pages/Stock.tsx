import { useState } from "react";
import { useListProducts, useGetStock } from "@workspace/api-client-react";
import { GHS, LOCATIONS } from "@/lib/format";
import { Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StockSearch() {
  const [q, setQ] = useState("");
  const { data: products, isLoading } = useListProducts();
  const { data: stock } = useGetStock();

  function getStock(code: string, location: string): number {
    return stock?.find(s => s.productCode === code && s.location === location)?.quantity ?? 0;
  }

  function totalStock(code: string): number {
    return LOCATIONS.reduce((s, l) => s + getStock(code, l), 0);
  }

  function lowLocations(code: string): number {
    return LOCATIONS.filter(l => getStock(code, l) <= 5).length;
  }

  const visible = products?.filter(p =>
    `${p.code} ${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="page-stock">
      {/* Search bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          data-testid="input-stock-search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by code, name, or category..."
          className="flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        {q && (
          <button data-testid="button-clear-search" onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-muted-foreground">{isLoading ? "Loading..." : `${visible.length} products`}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(p => {
            const low = lowLocations(p.code);
            const total = totalStock(p.code);
            const margin = Math.round(((p.price - p.cost) / p.price) * 100);
            return (
              <div key={p.code} className="rounded-2xl border border-border bg-card shadow-sm p-6" data-testid={`card-product-${p.code}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground">{p.code}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${low === 0 ? "bg-emerald-100 text-emerald-700" : low === 1 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {low === 0 ? "All Good" : `${low} Low`}
                      </span>
                    </div>
                    <h3 className="mt-2 text-xl font-black text-foreground">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.category} · {GHS(p.price)} / {p.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-foreground" data-testid={`total-stock-${p.code}`}>{total}</p>
                    <p className="text-xs text-muted-foreground">Total units</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {LOCATIONS.map(l => {
                    const qty = getStock(p.code, l);
                    const isLow = qty <= 5;
                    return (
                      <div
                        key={l}
                        data-testid={`stock-${p.code}-${l.toLowerCase().replace(/\s+/g, "-")}`}
                        className={`rounded-xl p-3 ${isLow ? "bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900" : "bg-muted/50"}`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{l}</p>
                        <p className={`mt-1 text-xl font-black ${isLow ? "text-red-600" : "text-foreground"}`}>{qty}</p>
                        {isLow && <p className="text-[10px] text-red-500 font-bold mt-0.5">Low stock</p>}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Cost: <strong className="text-foreground">{GHS(p.cost)}</strong></span>
                  <span>Margin: <strong className="text-emerald-600">{margin}%</strong></span>
                  <span>Margin/unit: <strong className="text-foreground">{GHS(p.price - p.cost)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
