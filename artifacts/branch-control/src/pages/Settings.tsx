import { useState, useEffect, useRef } from "react";
import { useGetSettings, useUpdateSettings, useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useListProducts, useGetStock, getGetSettingsQueryKey, getListSuppliersQueryKey, getGetStockQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Building2, Truck, Package, MessageSquare, Palette, Upload } from "lucide-react";
import { LOCATIONS } from "@/lib/format";

type Section = "business" | "suppliers" | "initialStock" | "sms" | "interface" | null;

function SectionHeader({ id, open, toggle, icon: Icon, title, desc }: {
  id: Section; open: Section; toggle: (s: Section) => void;
  icon: any; title: string; desc: string;
}) {
  const isOpen = open === id;
  return (
    <button
      onClick={() => toggle(id)}
      className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors rounded-2xl"
      data-testid={`section-${id}`}
    >
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState<Section>("business");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();
  const { data: suppliers, isLoading: suppLoading } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const { data: products } = useListProducts();
  const { data: stock } = useGetStock({ query: { queryKey: getGetStockQueryKey() } });

  const [profile, setProfile] = useState({ companyName: "", phone: "", email: "", logoUrl: "", accentColor: "#0f172a", smsCredit: true, smsLowStock: true, smsDaily: false, smsSenderId: "BRANCHCTRL" });
  const [supplierForm, setSupplierForm] = useState({ id: null as number | null, name: "", phone: "" });
  const [stockMap, setStockMap] = useState<Record<string, Record<string, string>>>({});
  const [editingSupp, setEditingSupp] = useState<number | null>(null);

  useEffect(() => {
    if (settings) {
      setProfile({
        companyName: settings.companyName,
        phone: settings.phone,
        email: settings.email,
        logoUrl: settings.logoUrl,
        accentColor: settings.accentColor,
        smsCredit: settings.smsCredit,
        smsLowStock: settings.smsLowStock,
        smsDaily: settings.smsDaily,
        smsSenderId: settings.smsSenderId,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (stock && products) {
      const map: Record<string, Record<string, string>> = {};
      LOCATIONS.forEach(loc => {
        map[loc] = {};
        products.forEach(p => {
          const q = stock.find(s => s.location === loc && s.productCode === p.code)?.quantity ?? 0;
          map[loc][p.code] = String(q);
        });
      });
      setStockMap(map);
    }
  }, [stock, products]);

  function toggle(s: Section) { setOpen(prev => prev === s ? null : s); }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setProfile(f => ({ ...f, logoUrl: url }));
      localStorage.setItem("bc_logo", url);
    };
    reader.readAsDataURL(file);
  }

  function handleSaveProfile() {
    localStorage.setItem("bc_company", profile.companyName);
    localStorage.setItem("bc_logo", profile.logoUrl);
    updateSettings.mutate({ data: profile }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Saved", description: "Business profile updated." });
      }
    });
  }

  async function handleStockSave() {
    let count = 0;
    for (const loc of LOCATIONS) {
      for (const p of products ?? []) {
        const qty = Number(stockMap[loc]?.[p.code] ?? 0);
        try {
          await fetch("/api/stock/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location: loc, productCode: p.code, quantity: qty }),
          });
          count++;
        } catch {}
      }
    }
    qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
    toast({ title: "Stock updated", description: `${count} stock entries saved.` });
  }

  function resetSupplierForm() { setSupplierForm({ id: null, name: "", phone: "" }); setEditingSupp(null); }

  function handleEditSupplier(s: any) {
    setSupplierForm({ id: s.id, name: s.name, phone: s.phone });
    setEditingSupp(s.id);
  }

  function handleSaveSupplier() {
    if (!supplierForm.name) return;
    if (editingSupp != null) {
      updateSupplier.mutate({ id: editingSupp, data: supplierForm }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
          toast({ title: "Supplier updated" });
          resetSupplierForm();
        }
      });
    } else {
      createSupplier.mutate({ data: supplierForm }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
          toast({ title: "Supplier added" });
          resetSupplierForm();
        }
      });
    }
  }

  function handleDeleteSupplier(id: number) {
    if (!confirm("Delete this supplier?")) return;
    deleteSupplier.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        toast({ title: "Supplier removed" });
      }
    });
  }

  const inputClass = "rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 w-full";
  const labelClass = "block mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground";
  const smsToggles = [
    { key: "smsCredit" as const, label: "Credit sale notifications", desc: "SMS owner when credit sale is recorded" },
    { key: "smsLowStock" as const, label: "Low stock alerts", desc: "Alert when any item drops below 5 units" },
    { key: "smsDaily" as const, label: "Daily report summary", desc: "Send SMS summary at 8pm daily" },
  ];

  return (
    <div className="p-6 space-y-4 max-w-3xl" data-testid="page-settings">
      <div>
        <h1 className="text-2xl font-black text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your business, suppliers, stock, and interface</p>
      </div>

      {/* Business Profile */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="business" open={open} toggle={toggle} icon={Building2} title="Business Profile" desc="Company name, logo, contact details" />
        {open === "business" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-5">
            {/* Logo upload */}
            <div>
              <label className={labelClass}>Company Logo</label>
              <div className="flex items-start gap-4">
                <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors" onClick={() => fileRef.current?.click()}>
                  {profile.logoUrl ? (
                    <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                      <p className="text-[10px] text-muted-foreground mt-1">Upload</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-bold hover:bg-muted/70 transition-all">
                    <Upload className="h-4 w-4" /> Upload Logo
                  </button>
                  {profile.logoUrl && (
                    <button onClick={() => { setProfile(f => ({ ...f, logoUrl: "" })); localStorage.removeItem("bc_logo"); }}
                      className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-all">
                      <X className="h-4 w-4" /> Remove Logo
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Shows on the login screen and reports.</p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Company Name</label>
                  <input data-testid="input-company-name" value={profile.companyName} onChange={e => setProfile(f => ({ ...f, companyName: e.target.value }))} className={inputClass} placeholder="e.g. Aseda Building Materials" />
                </div>
                <div>
                  <label className={labelClass}>Business Phone</label>
                  <input data-testid="input-business-phone" value={profile.phone} onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="030 XXX XXXX" />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input data-testid="input-email" value={profile.email} onChange={e => setProfile(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="owner@company.com" />
                </div>
              </div>
            )}
            <div className="flex">
              <button data-testid="button-save-settings" onClick={handleSaveProfile} disabled={updateSettings.isPending || isLoading}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                <Save className="h-4 w-4" /> {updateSettings.isPending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interface */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="interface" open={open} toggle={toggle} icon={Palette} title="Interface Customisation" desc="Accent colour, branding preferences" />
        {open === "interface" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
            <div>
              <label className={labelClass}>Primary Accent Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={profile.accentColor}
                  onChange={e => setProfile(f => ({ ...f, accentColor: e.target.value }))}
                  className="h-12 w-12 rounded-xl border border-border cursor-pointer bg-background"
                />
                <input
                  value={profile.accentColor}
                  onChange={e => setProfile(f => ({ ...f, accentColor: e.target.value }))}
                  className="w-40 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono font-semibold outline-none focus:border-primary"
                />
                <div className="h-10 w-10 rounded-xl shrink-0" style={{ background: profile.accentColor }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Colour used for primary buttons and active navigation</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["#0f172a","#1d4ed8","#15803d","#b45309","#7c3aed","#be123c","#0e7490","#374151"].map(c => (
                <button key={c} onClick={() => setProfile(f => ({ ...f, accentColor: c }))}
                  className={`h-10 rounded-xl border-2 transition-all ${profile.accentColor === c ? "border-foreground scale-95" : "border-transparent hover:scale-95"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <button onClick={handleSaveProfile} disabled={updateSettings.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
              <Save className="h-4 w-4" /> Save Interface
            </button>
          </div>
        )}
      </div>

      {/* Suppliers */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="suppliers" open={open} toggle={toggle} icon={Truck} title="Suppliers" desc="Add, edit and remove your suppliers" />
        {open === "suppliers" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{editingSupp ? "Edit Supplier" : "Add New Supplier"}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Dangote Cement" data-testid="input-supplier-name" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} placeholder="050 XXX XXXX" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button data-testid="button-save-supplier" onClick={handleSaveSupplier} disabled={!supplierForm.name || createSupplier.isPending || updateSupplier.isPending}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                  <Save className="h-4 w-4" /> {editingSupp ? "Update" : "Add Supplier"}
                </button>
                {editingSupp && (
                  <button onClick={resetSupplierForm} className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold hover:bg-muted transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {suppLoading ? (
              <div className="space-y-2"><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-full rounded-xl" /></div>
            ) : !suppliers?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No suppliers added yet.</p>
            ) : (
              <div className="space-y-2">
                {suppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <div>
                      <p className="font-black text-foreground text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.phone || "No phone"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditSupplier(s)} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/70 flex items-center gap-1">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Initial Stock Setup */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="initialStock" open={open} toggle={toggle} icon={Package} title="Initial Stock Setup" desc="Set opening stock quantities before going live" />
        {open === "initialStock" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-300">
              Use this to set opening stock counts before selling. Values will overwrite current quantities.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Product</th>
                    {LOCATIONS.map(l => (
                      <th key={l} className="px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(products ?? []).map(p => (
                    <tr key={p.code} className="border-b border-border/50">
                      <td className="px-3 py-2">
                        <p className="font-bold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.code} · {p.unit}</p>
                      </td>
                      {LOCATIONS.map(loc => (
                        <td key={loc} className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={stockMap[loc]?.[p.code] ?? "0"}
                            onChange={e => setStockMap(m => ({ ...m, [loc]: { ...(m[loc] ?? {}), [p.code]: e.target.value } }))}
                            className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-primary"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button data-testid="button-save-stock" onClick={handleStockSave}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 transition-all">
              <Save className="h-4 w-4" /> Save All Stock Quantities
            </button>
          </div>
        )}
      </div>

      {/* SMS */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="sms" open={open} toggle={toggle} icon={MessageSquare} title="SMS & Notifications" desc="Configure automatic alerts and sender ID" />
        {open === "sms" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-3">
            {smsToggles.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <div>
                  <p className="font-bold text-foreground text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <button
                  data-testid={`toggle-${key}`}
                  onClick={() => setProfile(f => ({ ...f, [key]: !f[key] }))}
                  className={`relative h-6 w-11 rounded-full transition-all ${profile[key] ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${profile[key] ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
            <div>
              <label className={labelClass}>SMS Sender ID</label>
              <input data-testid="input-sms-sender" value={profile.smsSenderId} onChange={e => setProfile(f => ({ ...f, smsSenderId: e.target.value }))} className={`${inputClass} max-w-xs`} />
            </div>
            <button data-testid="button-save-sms" onClick={handleSaveProfile} disabled={updateSettings.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
              <Save className="h-4 w-4" /> Save SMS Settings
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/40">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40" />
          Powered by <strong className="ml-0.5 text-muted-foreground/60">ChalePay</strong>
        </div>
      </div>
    </div>
  );
}
