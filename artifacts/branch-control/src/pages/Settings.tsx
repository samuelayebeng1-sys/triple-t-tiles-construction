import { useState, useEffect, useRef } from "react";
import {
  useGetSettings, useUpdateSettings,
  useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useListLocations, useCreateLocation, useUpdateLocation, useDeleteLocation,
  useGetStock,
  getGetSettingsQueryKey, getListSuppliersQueryKey, getGetStockQueryKey,
  getListProductsQueryKey, getListLocationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight,
  Building2, Truck, Package, MessageSquare, Palette, Upload, MapPin,
} from "lucide-react";

type Section = "business" | "suppliers" | "products" | "locations" | "initialStock" | "sms" | "interface" | null;

function hexToHslValues(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyAccentColor(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const hsl = hexToHslValues(hex);
  document.documentElement.style.setProperty("--primary", hsl);
  document.documentElement.style.setProperty("--sidebar-primary", hsl);
  document.documentElement.style.setProperty("--ring", hsl);
}

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

function InitialStockPanel({
  products, locations, stockMap, setStockMap, onSave,
}: {
  products: any[];
  locations: any[];
  stockMap: Record<string, Record<string, string>>;
  setStockMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  onSave: () => void;
}) {
  const branches = locations.filter(l => l.type === "branch");
  const warehouses = locations.filter(l => l.type === "warehouse");
  const locationGroups = [
    { label: "Branches", locs: branches.map(l => l.name) },
    { label: "Warehouses", locs: warehouses.map(l => l.name) },
  ].filter(g => g.locs.length > 0);

  const [activeTab, setActiveTab] = useState<string>(() => {
    return branches[0]?.name ?? warehouses[0]?.name ?? "";
  });

  useEffect(() => {
    if (!activeTab && locations.length > 0) setActiveTab(locations[0].name);
  }, [locations]);

  function adjust(loc: string, code: string, delta: number) {
    setStockMap(m => {
      const cur = Math.max(0, Number(m[loc]?.[code] ?? 0) + delta);
      return { ...m, [loc]: { ...(m[loc] ?? {}), [code]: String(cur) } };
    });
  }

  const totalForTab = products.reduce((s, p) => s + Number(stockMap[activeTab]?.[p.code] ?? 0), 0);

  return (
    <div className="border-t border-border">
      <div className="px-6 pt-5">
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-300">
          Set opening counts per location before you go live. These values will overwrite current quantities.
        </div>
      </div>

      <div className="px-6 pt-4">
        {locationGroups.map(group => (
          <div key={group.label} className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">{group.label}</p>
            <div className="flex gap-2 flex-wrap">
              {group.locs.map(loc => (
                <button
                  key={loc}
                  onClick={() => setActiveTab(loc)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    activeTab === loc
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-2 pt-3 space-y-2">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No products found.</p>
        ) : (
          products.map(p => {
            const qty = Number(stockMap[activeTab]?.[p.code] ?? 0);
            return (
              <div key={p.code} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground text-sm leading-tight">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{p.code}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[10px] font-bold text-muted-foreground">{p.unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => adjust(activeTab, p.code, -1)}
                    disabled={qty <= 0}
                    className="h-8 w-8 rounded-lg border border-border bg-muted flex items-center justify-center text-lg font-black text-muted-foreground hover:bg-muted/70 disabled:opacity-30 transition-all leading-none"
                  >−</button>
                  <input
                    type="number" min="0"
                    value={qty === 0 ? "" : qty}
                    placeholder="0"
                    onChange={e => setStockMap(m => ({ ...m, [activeTab]: { ...(m[activeTab] ?? {}), [p.code]: e.target.value } }))}
                    className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm font-black outline-none focus:border-primary text-foreground"
                  />
                  <button
                    onClick={() => adjust(activeTab, p.code, 1)}
                    className="h-8 w-8 rounded-lg border border-border bg-muted flex items-center justify-center text-lg font-black text-muted-foreground hover:bg-muted/70 transition-all leading-none"
                  >+</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-6 pb-6 pt-3 flex items-center justify-between gap-4">
        <p className="text-xs font-bold text-muted-foreground">
          <span className="font-black text-foreground">{totalForTab}</span> total units for {activeTab}
        </p>
        <button
          data-testid="button-save-stock"
          onClick={onSave}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white hover:bg-emerald-700 transition-all"
        >
          <Save className="h-4 w-4" /> Save All Stock
        </button>
      </div>
    </div>
  );
}

const BLANK_PRODUCT = { id: null as number | null, code: "", name: "", category: "", price: "", cost: "", unit: "" };
const BLANK_LOC = { id: null as number | null, name: "", type: "branch" };

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
  const { data: products } = useListProducts({ query: { queryKey: getListProductsQueryKey() } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { data: locations } = useListLocations({ query: { queryKey: getListLocationsQueryKey() } });
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const { data: stock } = useGetStock({ query: { queryKey: getGetStockQueryKey() } });

  const [profile, setProfile] = useState({ companyName: "", phone: "", email: "", logoUrl: "", accentColor: "#0f172a", smsCredit: true, smsLowStock: true, smsDaily: false, smsSenderId: "BRANCHCTRL" });
  const [supplierForm, setSupplierForm] = useState({ id: null as number | null, name: "", phone: "" });
  const [editingSupp, setEditingSupp] = useState<number | null>(null);
  const [productForm, setProductForm] = useState({ ...BLANK_PRODUCT });
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [locationForm, setLocationForm] = useState({ ...BLANK_LOC });
  const [editingLocation, setEditingLocation] = useState<number | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, Record<string, string>>>({});

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
      applyAccentColor(settings.accentColor);
    }
  }, [settings]);

  useEffect(() => {
    if (stock && products && locations) {
      const allLocs = locations.map(l => l.name);
      const map: Record<string, Record<string, string>> = {};
      allLocs.forEach(loc => {
        map[loc] = {};
        products.forEach(p => {
          const q = stock.find(s => s.location === loc && s.productCode === p.code)?.quantity ?? 0;
          map[loc][p.code] = String(q);
        });
      });
      setStockMap(map);
    }
  }, [stock, products, locations]);

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
    applyAccentColor(profile.accentColor);
    updateSettings.mutate({ data: profile }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Saved", description: "Business profile updated." });
      }
    });
  }

  async function handleStockSave() {
    let count = 0;
    for (const loc of (locations ?? [])) {
      for (const p of products ?? []) {
        const qty = Number(stockMap[loc.name]?.[p.code] ?? 0);
        try {
          await fetch("/api/stock/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location: loc.name, productCode: p.code, quantity: qty }),
          });
          count++;
        } catch {}
      }
    }
    qc.invalidateQueries({ queryKey: getGetStockQueryKey() });
    toast({ title: "Stock updated", description: `${count} stock entries saved.` });
  }

  function resetSupplierForm() { setSupplierForm({ id: null, name: "", phone: "" }); setEditingSupp(null); }
  function handleEditSupplier(s: any) { setSupplierForm({ id: s.id, name: s.name, phone: s.phone }); setEditingSupp(s.id); }
  function handleSaveSupplier() {
    if (!supplierForm.name) return;
    if (editingSupp != null) {
      updateSupplier.mutate({ id: editingSupp, data: supplierForm }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier updated" }); resetSupplierForm(); }
      });
    } else {
      createSupplier.mutate({ data: supplierForm }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier added" }); resetSupplierForm(); }
      });
    }
  }
  function handleDeleteSupplier(id: number) {
    if (!confirm("Delete this supplier?")) return;
    deleteSupplier.mutate({ id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier removed" }); }
    });
  }

  function resetProductForm() { setProductForm({ ...BLANK_PRODUCT }); setEditingProduct(null); }
  function handleEditProduct(p: any) {
    setProductForm({ id: p.id, code: p.code, name: p.name, category: p.category, price: String(p.price), cost: String(p.cost), unit: p.unit });
    setEditingProduct(p.id);
  }
  function handleSaveProduct() {
    if (!productForm.name || !productForm.code) return;
    const data = {
      code: productForm.code,
      name: productForm.name,
      category: productForm.category,
      price: Number(productForm.price),
      cost: Number(productForm.cost),
      unit: productForm.unit,
    };
    if (editingProduct != null) {
      updateProduct.mutate({ id: editingProduct, data }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductsQueryKey() }); toast({ title: "Product updated" }); resetProductForm(); }
      });
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductsQueryKey() }); toast({ title: "Product added" }); resetProductForm(); }
      });
    }
  }
  function handleDeleteProduct(id: number) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    deleteProduct.mutate({ id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductsQueryKey() }); toast({ title: "Product deleted" }); }
    });
  }

  function resetLocationForm() { setLocationForm({ ...BLANK_LOC }); setEditingLocation(null); }
  function handleEditLocation(l: any) { setLocationForm({ id: l.id, name: l.name, type: l.type }); setEditingLocation(l.id); }
  function handleSaveLocation() {
    if (!locationForm.name) return;
    const data = { name: locationForm.name, type: locationForm.type };
    if (editingLocation != null) {
      updateLocation.mutate({ id: editingLocation, data }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListLocationsQueryKey() }); toast({ title: "Location updated" }); resetLocationForm(); }
      });
    } else {
      createLocation.mutate({ data }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getListLocationsQueryKey() }); toast({ title: "Location added" }); resetLocationForm(); }
      });
    }
  }
  function handleDeleteLocation(id: number) {
    if (!confirm("Delete this location? Existing stock data for it will remain but the location won't appear in new operations.")) return;
    deleteLocation.mutate({ id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListLocationsQueryKey() }); toast({ title: "Location removed" }); }
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
        <p className="text-sm text-muted-foreground">Configure your business, products, locations, and interface</p>
      </div>

      {/* Business Profile */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="business" open={open} toggle={toggle} icon={Building2} title="Business Profile" desc="Company name, logo, contact details" />
        {open === "business" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-5">
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
                  onChange={e => {
                    const c = e.target.value;
                    setProfile(f => ({ ...f, accentColor: c }));
                    applyAccentColor(c);
                  }}
                  className="h-12 w-12 rounded-xl border border-border cursor-pointer bg-background"
                />
                <input
                  value={profile.accentColor}
                  onChange={e => {
                    const c = e.target.value;
                    setProfile(f => ({ ...f, accentColor: c }));
                    applyAccentColor(c);
                  }}
                  className="w-40 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono font-semibold outline-none focus:border-primary"
                />
                <div className="h-10 w-10 rounded-xl shrink-0" style={{ background: profile.accentColor }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Colour used for primary buttons and active navigation. Changes apply instantly.</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["#0f172a","#1d4ed8","#15803d","#b45309","#7c3aed","#be123c","#0e7490","#374151"].map(c => (
                <button key={c}
                  onClick={() => { setProfile(f => ({ ...f, accentColor: c })); applyAccentColor(c); }}
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

      {/* Products */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="products" open={open} toggle={toggle} icon={Package} title="Products" desc="Add, edit and remove your product catalogue" />
        {open === "products" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{editingProduct ? "Edit Product" : "Add New Product"}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Item Code *</label>
                  <input value={productForm.code} onChange={e => setProductForm(f => ({ ...f, code: e.target.value }))} className={inputClass} placeholder="e.g. CEM-001" />
                </div>
                <div>
                  <label className={labelClass}>Name *</label>
                  <input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Dangote Cement 50kg" />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <input value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} className={inputClass} placeholder="e.g. Cement" />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <input value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} className={inputClass} placeholder="e.g. bag, piece, roll" />
                </div>
                <div>
                  <label className={labelClass}>Selling Price (GH₵)</label>
                  <input type="number" min="0" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Cost Price (GH₵)</label>
                  <input type="number" min="0" value={productForm.cost} onChange={e => setProductForm(f => ({ ...f, cost: e.target.value }))} className={inputClass} placeholder="0.00" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={handleSaveProduct} disabled={!productForm.name || !productForm.code || createProduct.isPending || updateProduct.isPending}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                  <Save className="h-4 w-4" /> {editingProduct ? "Update Product" : "Add Product"}
                </button>
                {editingProduct && (
                  <button onClick={resetProductForm} className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold hover:bg-muted transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {!products ? (
              <div className="space-y-2"><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-full rounded-xl" /></div>
            ) : !products.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No products yet. Add your first one above.</p>
            ) : (
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-foreground text-sm">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{p.code}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{p.category}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{p.unit}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs font-bold text-emerald-600">GH₵{p.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleEditProduct(p)} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/70 flex items-center gap-1">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1">
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

      {/* Locations */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <SectionHeader id="locations" open={open} toggle={toggle} icon={MapPin} title="Branches & Warehouses" desc="Manage your sales branches and storage locations" />
        {open === "locations" && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{editingLocation ? "Edit Location" : "Add New Location"}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input value={locationForm.name} onChange={e => setLocationForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Tema or East Warehouse" />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select value={locationForm.type} onChange={e => setLocationForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
                    <option value="branch">Branch (Showroom)</option>
                    <option value="warehouse">Warehouse</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={handleSaveLocation} disabled={!locationForm.name || createLocation.isPending || updateLocation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                  <Save className="h-4 w-4" /> {editingLocation ? "Update Location" : "Add Location"}
                </button>
                {editingLocation && (
                  <button onClick={resetLocationForm} className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold hover:bg-muted transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {!locations ? (
              <div className="space-y-2"><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-full rounded-xl" /></div>
            ) : !locations.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No locations yet.</p>
            ) : (
              <div className="space-y-2">
                {["branch", "warehouse"].map(type => {
                  const group = locations.filter(l => l.type === type);
                  if (!group.length) return null;
                  return (
                    <div key={type}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{type === "branch" ? "Branches / Showrooms" : "Warehouses"}</p>
                      {group.map(l => (
                        <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 mb-2">
                          <div>
                            <p className="font-black text-foreground text-sm">{l.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{l.type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditLocation(l)} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/70 flex items-center gap-1">
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button onClick={() => handleDeleteLocation(l.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center gap-1">
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
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
          <InitialStockPanel
            products={products ?? []}
            locations={locations ?? []}
            stockMap={stockMap}
            setStockMap={setStockMap}
            onSave={handleStockSave}
          />
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
                  onClick={() => setProfile(f => ({ ...f, [key]: !f[key] }))}
                  className={`relative h-6 w-11 rounded-full transition-all ${profile[key] ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${profile[key] ? "left-5.5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
            <div>
              <label className={labelClass}>SMS Sender ID</label>
              <input value={profile.smsSenderId} onChange={e => setProfile(f => ({ ...f, smsSenderId: e.target.value.toUpperCase().slice(0, 11) }))} className={inputClass} placeholder="BRANCHCTRL" maxLength={11} />
              <p className="text-xs text-muted-foreground mt-1">Max 11 characters, letters and numbers only.</p>
            </div>
            <button onClick={handleSaveProfile} disabled={updateSettings.isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
              <Save className="h-4 w-4" /> Save SMS Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
