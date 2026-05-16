import { useState, useEffect, useRef } from "react";
import {
  useGetSettings, useUpdateSettings, useListSuppliers, useCreateSupplier,
  useUpdateSupplier, useDeleteSupplier, useListProducts,
  getGetSettingsQueryKey, getListSuppliersQueryKey, getListProductsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save, Plus, Pencil, Trash2, X, Building2, Truck, Package,
  MessageSquare, Palette, Upload, DollarSign, ChevronLeft
} from "lucide-react";

type Section = "business" | "pricing" | "suppliers" | "sms" | "interface" | null;

const SECTIONS = [
  { id: "business" as Section, icon: Building2, title: "Business Profile", desc: "Company name and logo" },
  { id: "pricing" as Section, icon: DollarSign, title: "Products & Pricing", desc: "Selling price and cost price" },
  { id: "suppliers" as Section, icon: Truck, title: "Suppliers", desc: "Manage your suppliers" },
  { id: "sms" as Section, icon: MessageSquare, title: "SMS & Notifications", desc: "Recipients and alert times" },
  { id: "interface" as Section, icon: Palette, title: "Interface", desc: "Colour and branding" },
];

const inputClass = "rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 w-full";
const labelClass = "block mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground";

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [active, setActive] = useState<Section>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();
  const { data: suppliers, isLoading: suppLoading } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const createSupplier = useCreateSupplier();
  const updateSup = useUpdateSupplier();
  const deleteSup = useDeleteSupplier();
  const { data: products, isLoading: prodLoading } = useListProducts({ query: { queryKey: getListProductsQueryKey() } });

  const [profile, setProfile] = useState({ companyName: "", phone: "", logoUrl: "", accentColor: "#0f172a", smsCredit: true, smsLowStock: true, smsDaily: false, smsSenderId: "BRANCHCTRL", smsNumbers: "", smsTime: "20:00" });
  const [pricingEdits, setPricingEdits] = useState<Record<string, { price: string; cost: string }>>({});
  const [supplierForm, setSupplierForm] = useState({ id: null as number | null, name: "", phone: "", email: "", contact: "", notes: "" });
  const [editingSupp, setEditingSupp] = useState<number | null>(null);

  useEffect(() => {
    if (settings) {
      setProfile({
        companyName: settings.companyName,
        phone: settings.phone,
        logoUrl: settings.logoUrl,
        accentColor: settings.accentColor,
        smsCredit: settings.smsCredit,
        smsLowStock: settings.smsLowStock,
        smsDaily: settings.smsDaily,
        smsSenderId: settings.smsSenderId,
        smsNumbers: (settings as any).smsNumbers ?? "",
        smsTime: (settings as any).smsTime ?? "20:00",
      });
    }
  }, [settings]);

  useEffect(() => {
    if (products) {
      const edits: Record<string, { price: string; cost: string }> = {};
      products.forEach(p => { edits[p.code] = { price: String(p.price), cost: String(p.cost) }; });
      setPricingEdits(edits);
    }
  }, [products]);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const url = ev.target?.result as string; setProfile(f => ({ ...f, logoUrl: url })); localStorage.setItem("bc_logo", url); };
    reader.readAsDataURL(file);
  }

  function handleSaveProfile(successMsg?: string) {
    localStorage.setItem("bc_company", profile.companyName);
    if (profile.logoUrl) localStorage.setItem("bc_logo", profile.logoUrl);
    updateSettings.mutate({ data: { companyName: profile.companyName, phone: profile.phone, logoUrl: profile.logoUrl, accentColor: profile.accentColor, smsCredit: profile.smsCredit, smsLowStock: profile.smsLowStock, smsDaily: profile.smsDaily, smsSenderId: profile.smsSenderId } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() }); toast({ title: successMsg ?? "Saved" }); }
    });
  }

  async function handleSavePricing() {
    let count = 0;
    for (const p of products ?? []) {
      const edit = pricingEdits[p.code];
      if (!edit) continue;
      if (String(p.price) !== edit.price || String(p.cost) !== edit.cost) {
        await fetch(`/api/products/${p.code}/pricing`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: Number(edit.price), cost: Number(edit.cost) }),
        }).catch(() => {});
        count++;
      }
    }
    qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
    toast({ title: "Prices updated", description: `${count} product(s) updated.` });
  }

  function resetSupp() { setSupplierForm({ id: null, name: "", phone: "", email: "", contact: "", notes: "" }); setEditingSupp(null); }
  function startEditSupp(s: any) { setSupplierForm({ id: s.id, name: s.name, phone: s.phone, email: s.email, contact: s.contact, notes: s.notes }); setEditingSupp(s.id); }
  function handleSaveSupp() {
    if (!supplierForm.name) return;
    if (editingSupp != null) {
      updateSup.mutate({ id: editingSupp, data: supplierForm }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier updated" }); resetSupp(); } });
    } else {
      createSupplier.mutate({ data: supplierForm }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier added" }); resetSupp(); } });
    }
  }
  function handleDeleteSupp(id: number) {
    if (!confirm("Delete this supplier?")) return;
    deleteSup.mutate({ id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier removed" }); } });
  }

  // ── Grid tile grid ────────────────────────────────────────────────────────────

  if (!active) {
    return (
      <div className="p-6 max-w-3xl" data-testid="page-settings">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Tap a section to configure it</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SECTIONS.map(({ id, icon: Icon, title, desc }) => (
            <button key={id} data-testid={`section-${id}`} onClick={() => setActive(id)}
              className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm hover:border-primary/40 hover:shadow-md transition-all group active:scale-[0.97]">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-black text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-center mt-10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/40">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40" />
            Powered by <strong className="ml-0.5 text-muted-foreground/60">ChalePay</strong>
          </div>
        </div>
      </div>
    );
  }

  // ── Back bar ─────────────────────────────────────────────────────────────────

  const cur = SECTIONS.find(s => s.id === active)!;
  function BackBar() {
    return (
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setActive(null); resetSupp(); }}
          className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-bold hover:bg-muted/70 transition-all">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <h1 className="text-xl font-black text-foreground">{cur.title}</h1>
          <p className="text-xs text-muted-foreground">{cur.desc}</p>
        </div>
      </div>
    );
  }

  // ── Business Profile ─────────────────────────────────────────────────────────

  if (active === "business") return (
    <div className="p-6 max-w-2xl" data-testid="page-settings">
      <BackBar />
      <div className="space-y-5">
        <div>
          <label className={labelClass}>Company Logo</label>
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors" onClick={() => fileRef.current?.click()}>
              {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" /> : <div className="text-center"><Upload className="h-6 w-6 text-muted-foreground mx-auto" /><p className="text-[10px] text-muted-foreground mt-1">Upload</p></div>}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-bold hover:bg-muted/70 transition-all"><Upload className="h-4 w-4" /> Upload Logo</button>
              {profile.logoUrl && <button onClick={() => { setProfile(f => ({ ...f, logoUrl: "" })); localStorage.removeItem("bc_logo"); }} className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-all"><X className="h-4 w-4" /> Remove</button>}
              <p className="text-xs text-muted-foreground">Appears on the login screen and reports.</p>
            </div>
          </div>
        </div>
        {isLoading ? <Skeleton className="h-32 w-full rounded-xl" /> : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>Company Name</label>
              <input data-testid="input-company-name" value={profile.companyName} onChange={e => setProfile(f => ({ ...f, companyName: e.target.value }))} className={inputClass} placeholder="e.g. Aseda Building Materials" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Business Phone</label>
              <input data-testid="input-business-phone" value={profile.phone} onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="030 XXX XXXX" />
            </div>
          </div>
        )}
        <button data-testid="button-save-settings" onClick={() => handleSaveProfile("Business profile saved.")} disabled={updateSettings.isPending || isLoading}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
          <Save className="h-4 w-4" /> {updateSettings.isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );

  // ── Products & Pricing ───────────────────────────────────────────────────────

  if (active === "pricing") return (
    <div className="p-6 max-w-3xl" data-testid="page-settings">
      <BackBar />
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm font-bold text-blue-800 dark:text-blue-300 mb-5">
        Edit selling price and cost price for each product. Changes apply immediately to new sales.
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60">
              {["Product", "Unit", "Cost Price (GH₵)", "Selling Price (GH₵)", "Margin"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prodLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
              ))
            ) : (products ?? []).map(p => {
              const edit = pricingEdits[p.code] ?? { price: String(p.price), cost: String(p.cost) };
              const margin = Number(edit.price) > 0 ? Math.round(((Number(edit.price) - Number(edit.cost)) / Number(edit.price)) * 100) : 0;
              const profit = Number(edit.price) - Number(edit.cost);
              return (
                <tr key={p.code} className="border-t border-border/60 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.code}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-semibold">{p.unit}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">₵</span>
                      <input
                        type="number" value={edit.cost}
                        onChange={e => setPricingEdits(m => ({ ...m, [p.code]: { ...m[p.code], cost: e.target.value } }))}
                        className="w-28 rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">₵</span>
                      <input
                        type="number" value={edit.price}
                        onChange={e => setPricingEdits(m => ({ ...m, [p.code]: { ...m[p.code], price: e.target.value } }))}
                        className="w-28 rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className={`text-sm font-black ${margin >= 20 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-red-600"}`}>{margin}%</span>
                      <p className="text-xs text-muted-foreground">+₵{profit.toFixed(0)} / unit</p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button data-testid="button-save-pricing" onClick={handleSavePricing}
        className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all">
        <Save className="h-4 w-4" /> Save All Prices
      </button>
    </div>
  );

  // ── Suppliers ────────────────────────────────────────────────────────────────

  if (active === "suppliers") return (
    <div className="p-6 max-w-2xl" data-testid="page-settings">
      <BackBar />
      <div className="rounded-xl bg-muted/40 p-4 mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{editingSupp ? "Edit Supplier" : "Add Supplier"}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className={labelClass}>Name *</label><input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Dangote Cement" data-testid="input-supplier-name" /></div>
          <div><label className={labelClass}>Phone</label><input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="050 XXX XXXX" /></div>
          <div><label className={labelClass}>Contact Person</label><input value={supplierForm.contact} onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} className={inputClass} placeholder="Mr. Kofi Agyeman" /></div>
          <div><label className={labelClass}>Notes</label><input value={supplierForm.notes} onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} placeholder="Credit terms, schedule…" /></div>
        </div>
        <div className="mt-3 flex gap-2">
          <button data-testid="button-save-supplier" onClick={handleSaveSupp} disabled={!supplierForm.name}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
            <Save className="h-4 w-4" /> {editingSupp ? "Update" : "Add"}
          </button>
          {editingSupp && <button onClick={resetSupp} className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold hover:bg-muted transition-all">Cancel</button>}
        </div>
      </div>
      {suppLoading ? <Skeleton className="h-20 w-full rounded-xl" /> : !suppliers?.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">No suppliers yet.</p>
      ) : (
        <div className="space-y-2">
          {suppliers.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
              <div>
                <p className="font-black text-foreground text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground">{[s.phone, s.contact].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEditSupp(s)} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/70 flex items-center gap-1"><Pencil className="h-3 w-3" /> Edit</button>
                <button onClick={() => handleDeleteSupp(s.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── SMS & Notifications ──────────────────────────────────────────────────────

  if (active === "sms") return (
    <div className="p-6 max-w-2xl" data-testid="page-settings">
      <BackBar />
      <div className="space-y-5">
        {/* Recipients */}
        <div>
          <label className={labelClass}>SMS Recipients</label>
          <p className="text-xs text-muted-foreground mb-2">Phone numbers that will receive alerts. One per line or comma-separated.</p>
          <textarea
            data-testid="input-sms-numbers"
            value={profile.smsNumbers}
            onChange={e => setProfile(f => ({ ...f, smsNumbers: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-h-[90px] resize-none"
            placeholder={"0241234567\n0551234567\n0271234567"}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {([
            { key: "smsCredit" as const, label: "Credit sale notification", desc: "SMS when a credit sale is recorded" },
            { key: "smsLowStock" as const, label: "Low stock alert", desc: "Alert when any item drops below 5 units" },
            { key: "smsDaily" as const, label: "Daily report summary", desc: "Send sales summary SMS at scheduled time" },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div><p className="font-bold text-foreground text-sm">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
              <button data-testid={`toggle-${key}`} onClick={() => setProfile(f => ({ ...f, [key]: !f[key] }))}
                className={`relative h-6 w-11 rounded-full transition-all ${profile[key] ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${profile[key] ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Custom daily time */}
        {profile.smsDaily && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <label className={labelClass}>Daily Report Time</label>
            <p className="text-xs text-muted-foreground mb-3">Choose what time to send the daily summary SMS</p>
            <input
              data-testid="input-sms-time"
              type="time"
              value={profile.smsTime}
              onChange={e => setProfile(f => ({ ...f, smsTime: e.target.value }))}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-black text-foreground outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">Currently set to <strong>{profile.smsTime}</strong></p>
          </div>
        )}

        {/* Sender ID */}
        <div>
          <label className={labelClass}>SMS Sender ID</label>
          <input data-testid="input-sms-sender" value={profile.smsSenderId} onChange={e => setProfile(f => ({ ...f, smsSenderId: e.target.value }))} className={`${inputClass} max-w-xs`} />
        </div>

        <button data-testid="button-save-sms" onClick={() => handleSaveProfile("SMS settings saved.")} disabled={updateSettings.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
          <Save className="h-4 w-4" /> Save SMS Settings
        </button>
      </div>
    </div>
  );

  // ── Interface ────────────────────────────────────────────────────────────────

  if (active === "interface") return (
    <div className="p-6 max-w-2xl" data-testid="page-settings">
      <BackBar />
      <div className="space-y-5">
        <div>
          <label className={labelClass}>Primary Accent Colour</label>
          <div className="flex items-center gap-3 mb-3">
            <input type="color" value={profile.accentColor} onChange={e => setProfile(f => ({ ...f, accentColor: e.target.value }))} className="h-12 w-12 rounded-xl border border-border cursor-pointer" />
            <input value={profile.accentColor} onChange={e => setProfile(f => ({ ...f, accentColor: e.target.value }))} className="w-32 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono font-semibold outline-none focus:border-primary" />
            <div className="h-10 w-10 rounded-xl shrink-0 border border-border" style={{ background: profile.accentColor }} />
          </div>
          <div className="grid grid-cols-8 gap-2">
            {["#0f172a","#1d4ed8","#15803d","#b45309","#7c3aed","#be123c","#0e7490","#374151"].map(c => (
              <button key={c} onClick={() => setProfile(f => ({ ...f, accentColor: c }))}
                className={`h-10 rounded-xl border-2 transition-all ${profile.accentColor === c ? "border-foreground scale-95" : "border-transparent hover:scale-95"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <button onClick={() => handleSaveProfile("Interface saved.")} disabled={updateSettings.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
          <Save className="h-4 w-4" /> Save Interface
        </button>
      </div>
    </div>
  );

  return null;
}
