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
  Save, Plus, Pencil, Trash2, X, ChevronRight, ArrowLeft,
  Building2, Truck, Package, MessageSquare, Palette, Upload, MapPin, Layers,
} from "lucide-react";
import { applyAllColors, applyAccentColor, applyLoginGlowColor, applyContentBarColor, applySidebarColor, applyLoginPanelBg, applyLoginRightBg, applyContentBg } from "@/lib/theme";

type Page = "business" | "suppliers" | "products" | "locations" | "initialStock" | "sms" | "colours" | null;

function InitialStockPanel({ products, locations, stockMap, setStockMap, onSave }: {
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

const ACCENT_SWATCHES  = ["#0f172a","#1d4ed8","#15803d","#b45309","#7c3aed","#be123c","#0e7490","#374151"];
const GLOW_SWATCHES    = ["#7c3aed","#4f46e5","#0ea5e9","#059669","#dc2626","#db2777","#d97706","#0f172a"];
const BAR_SWATCHES     = ["#0f172a","#1d4ed8","#15803d","#b45309","#7c3aed","#be123c","#0e7490","#374151"];
const SIDEBAR_SWATCHES = ["#0f172a","#1e1b4b","#14532d","#431407","#3b0764","#4c0519","#083344","#18181b"];
const PANEL_SWATCHES   = ["#0a0f1e","#0f172a","#1e1b4b","#14532d","#3b0764","#4c0519","#083344","#18181b"];
const RIGHT_SWATCHES   = ["#f8fafc","#ffffff","#fef9f0","#f0fdf4","#fdf4ff","#fff1f2","#f0f9ff","#1a1a2e"];
const CONTENT_SWATCHES = ["#f1f5f9","#ffffff","#fefce8","#f0fdf4","#faf5ff","#fff1f2","#f0f9ff","#0f172a"];

function ColorZone({
  label, sub, swatches, value, onChange,
}: {
  label: string; sub: string; swatches: string[]; value: string; onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer rounded-xl"
          />
          <div
            className="h-12 w-12 rounded-xl border-2 border-border shadow-sm"
            style={{ background: value }}
          />
        </div>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono font-semibold outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {swatches.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            className={`h-7 rounded-lg border-2 transition-all ${value === c ? "border-foreground scale-90" : "border-transparent hover:scale-90"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState<Page>(null);
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

  const [profile, setProfile] = useState({
    companyName: "", phone: "", email: "", logoUrl: "",
    accentColor: "#0f172a", loginGlowColor: "#7c3aed", contentBarColor: "#0f172a",
    sidebarColor: "#0f172a", loginPanelBg: "#0a0f1e", loginRightBg: "#f8fafc", contentBg: "#f1f5f9",
    smsCredit: true, smsLowStock: true, smsDaily: false, smsDailyTime: "20:00", smsSenderId: "BRANCHCTRL",
  });
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
        loginGlowColor: settings.loginGlowColor,
        contentBarColor: settings.contentBarColor,
        sidebarColor: settings.sidebarColor,
        loginPanelBg: settings.loginPanelBg,
        loginRightBg: settings.loginRightBg,
        contentBg: settings.contentBg,
        smsCredit: settings.smsCredit,
        smsLowStock: settings.smsLowStock,
        smsDaily: settings.smsDaily,
        smsDailyTime: settings.smsDailyTime || "20:00",
        smsSenderId: settings.smsSenderId,
      });
      applyAllColors({
        accentColor: settings.accentColor,
        loginGlowColor: settings.loginGlowColor,
        contentBarColor: settings.contentBarColor,
        sidebarColor: settings.sidebarColor,
        loginPanelBg: settings.loginPanelBg,
        loginRightBg: settings.loginRightBg,
        contentBg: settings.contentBg,
      });
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
    applyAllColors(profile);
    updateSettings.mutate({ data: profile }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Saved", description: "Settings updated." });
      }
    });
  }

  function handleSaveInterface() {
    applyAllColors(profile);
    updateSettings.mutate({ data: profile }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Interface saved", description: "Colour settings applied across the app." });
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
      code: productForm.code, name: productForm.name, category: productForm.category,
      price: Number(productForm.price), cost: Number(productForm.cost), unit: productForm.unit,
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
    { key: "smsDaily" as const, label: "Daily report summary", desc: "Send a daily SMS summary at your chosen time" },
  ];

  const SETTINGS_GROUPS = [
    {
      label: "Your Business",
      items: [
        { id: "business" as Page,  icon: Building2,     title: "Business Profile",        desc: "Company name, logo and contact details",                 count: null,                    accent: "#3b82f6" },
        { id: "locations" as Page, icon: MapPin,        title: "Branches & Warehouses",   desc: "Manage your sales branches and storage locations",       count: locations?.length ?? null, accent: "#10b981" },
      ],
    },
    {
      label: "Catalogue & Stock",
      items: [
        { id: "products" as Page,     icon: Package, title: "Products",            desc: "Your product catalogue with pricing",             count: products?.length ?? null, accent: "#f59e0b" },
        { id: "suppliers" as Page,    icon: Truck,   title: "Suppliers",           desc: "Add, edit and remove your suppliers",             count: suppliers?.length ?? null, accent: "#8b5cf6" },
        { id: "initialStock" as Page, icon: Layers,  title: "Initial Stock Setup", desc: "Set opening stock quantities before going live",  count: null,                    accent: "#06b6d4" },
      ],
    },
    {
      label: "Notifications",
      items: [
        { id: "sms" as Page, icon: MessageSquare, title: "SMS & Notifications", desc: "Alerts, sender ID and notification toggles", count: null, accent: "#f43f5e" },
      ],
    },
    {
      label: "Appearance",
      items: [
        { id: "colours" as Page, icon: Palette, title: "Interface Customisation", desc: "Colours for login screen, sidebar, accent and pages", count: null, accent: "#64748b" },
      ],
    },
  ];

  const NAV_TILES = SETTINGS_GROUPS.flatMap(g => g.items);

  const currentTile = NAV_TILES.find(t => t.id === page);

  return (
    <div className="p-6 min-h-full" data-testid="page-settings">

      {/* ── Sub-page view ── */}
      {page !== null ? (
        <>
          {/* Back header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setPage(null)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold hover:bg-muted transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
            {currentTile && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                  <currentTile.icon className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-foreground leading-tight">{currentTile.title}</h1>
                  <p className="text-xs text-muted-foreground">{currentTile.desc}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sub-page content */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

            {page === "business" && (
              <div className="px-6 pb-6 pt-6 space-y-5">
                <div>
                  <label className={labelClass}>Company Logo</label>
                  <div className="flex items-start gap-4">
                    <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors shrink-0" onClick={() => fileRef.current?.click()}>
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

            {page === "sms" && (
              <div className="px-6 pb-6 pt-6 space-y-3">
                {smsToggles.map(({ key, label, desc }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
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

                    {key === "smsDaily" && profile.smsDaily && (
                      <div className="mt-2 ml-4 mr-4 rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-foreground text-sm">Send time</p>
                          <p className="text-xs text-muted-foreground">When the daily summary SMS goes out</p>
                        </div>
                        <input
                          type="time"
                          value={profile.smsDailyTime}
                          onChange={e => setProfile(f => ({ ...f, smsDailyTime: e.target.value }))}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 tabular-nums"
                        />
                      </div>
                    )}
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

            {page === "locations" && (
              <div className="px-6 pb-6 pt-6 space-y-4">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{editingLocation ? "Edit Location" : "Add New Location"}</p>
                  <div className="grid gap-3 grid-cols-2">
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

            {page === "suppliers" && (
              <div className="px-6 pb-6 pt-6 space-y-4">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{editingSupp ? "Edit Supplier" : "Add New Supplier"}</p>
                  <div className="grid gap-3 grid-cols-2">
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

            {page === "products" && (
              <div className="px-6 pb-6 pt-6 space-y-4">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{editingProduct ? "Edit Product" : "Add New Product"}</p>
                  <div className="grid gap-3 md:grid-cols-3">
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
                  <div className="grid gap-2 md:grid-cols-2">
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

            {page === "colours" && (
              <>
                {/* Row 1 */}
                <div className="px-6 pb-0 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ColorZone label="Primary Accent" sub="Buttons, active nav item, Sign In button, right panel labels" swatches={ACCENT_SWATCHES} value={profile.accentColor} onChange={c => { setProfile(f => ({ ...f, accentColor: c })); applyAccentColor(c); }} />
                  <ColorZone label="Login Left Panel Glow" sub="Left login portal — orbs, rotating rings, icon box glow effects" swatches={GLOW_SWATCHES} value={profile.loginGlowColor} onChange={c => { setProfile(f => ({ ...f, loginGlowColor: c })); applyLoginGlowColor(c); }} />
                  <ColorZone label="Workspace Top Bar" sub="Thin stripe at the top of every page after login — shows on every tab" swatches={BAR_SWATCHES} value={profile.contentBarColor} onChange={c => { setProfile(f => ({ ...f, contentBarColor: c })); applyContentBarColor(c); }} />
                </div>
                {/* Row 2 */}
                <div className="px-6 pb-2 pt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <ColorZone label="Sidebar Background" sub="Navigation sidebar — BranchControl, menu items and Sign Out" swatches={SIDEBAR_SWATCHES} value={profile.sidebarColor} onChange={c => { setProfile(f => ({ ...f, sidebarColor: c })); applySidebarColor(c); }} />
                  <ColorZone label="Login Left Panel Background" sub="The dark background behind the orbs, rings and BranchControl icon" swatches={PANEL_SWATCHES} value={profile.loginPanelBg} onChange={c => { setProfile(f => ({ ...f, loginPanelBg: c })); applyLoginPanelBg(c); }} />
                  <ColorZone label="Login Right Panel" sub="Background of the form side — OWNER PORTAL, fields and Sign In button" swatches={RIGHT_SWATCHES} value={profile.loginRightBg} onChange={c => { setProfile(f => ({ ...f, loginRightBg: c })); applyLoginRightBg(c); }} />
                  <ColorZone label="Page Background" sub="Background of every page — Dashboard, Reports, Stock Search, all tabs" swatches={CONTENT_SWATCHES} value={profile.contentBg} onChange={c => { setProfile(f => ({ ...f, contentBg: c })); applyContentBg(c); }} />
                </div>
                {/* Live preview mini-bar */}
                <div className="mx-6 mt-4 mb-5 rounded-xl overflow-hidden border border-border">
                  <div className="h-1 w-full" style={{ background: profile.contentBarColor }} />
                  <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap" style={{ background: profile.sidebarColor }}>
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: profile.loginPanelBg, border: "1px solid rgba(255,255,255,0.2)" }} />
                    <span className="text-[10px] font-bold text-white/60">Left panel</span>
                    <div className="h-2.5 w-2.5 rounded-full ml-2 shrink-0" style={{ background: profile.loginGlowColor }} />
                    <span className="text-[10px] font-bold text-white/60">Glow</span>
                    <div className="h-2.5 w-2.5 rounded-full ml-2 shrink-0" style={{ background: profile.accentColor }} />
                    <span className="text-[10px] font-bold text-white/60">Accent</span>
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      <div className="h-5 w-10 rounded shrink-0" style={{ background: profile.loginRightBg, border: "1px solid rgba(0,0,0,0.15)" }} />
                      <span className="text-[10px] font-bold text-white/60">Right</span>
                      <div className="h-5 w-10 rounded shrink-0" style={{ background: profile.contentBg, border: "1px solid rgba(0,0,0,0.15)" }} />
                      <span className="text-[10px] font-bold text-white/60">Pages</span>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <button onClick={handleSaveInterface} disabled={updateSettings.isPending}
                    className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {updateSettings.isPending ? "Saving..." : "Save Interface Colours"}
                  </button>
                </div>
              </>
            )}

            {page === "initialStock" && (
              <InitialStockPanel
                products={products ?? []}
                locations={locations ?? []}
                stockMap={stockMap}
                setStockMap={setStockMap}
                onSave={handleStockSave}
              />
            )}


          </div>
        </>
      ) : (
        <>
          {/* ── Main settings list ── */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your business, products, notifications and appearance</p>
          </div>

          <div className="max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAV_TILES.map(({ id, icon: Icon, title, desc, count, accent }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className="relative rounded-2xl border border-border bg-card text-left p-5 hover:border-foreground/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group overflow-hidden"
              >
                {/* Soft accent glow in the corner */}
                <div
                  className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl"
                  style={{ background: accent }}
                />

                <div className="relative">
                  {/* Top row: icon + optional count */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center ring-1 ring-inset"
                      style={{
                        background: accent + "14",
                        // @ts-ignore — CSS custom prop
                        "--tw-ring-color": accent + "30",
                      } as React.CSSProperties}
                    >
                      <Icon className="h-5 w-5" style={{ color: accent }} strokeWidth={2.25} />
                    </div>
                    {count !== null && (
                      <span
                        className="text-[11px] font-black rounded-md px-2 py-0.5 tabular-nums"
                        style={{ background: accent + "14", color: accent }}
                      >
                        {count}
                      </span>
                    )}
                  </div>

                  {/* Title + description */}
                  <p className="font-black text-foreground text-[15px] leading-tight tracking-tight">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{desc}</p>

                  {/* Subtle "open" affordance */}
                  <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: accent }}
                  >
                    Open
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
