import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Save } from "lucide-react";

const SETTINGS_SECTIONS = [
  "Business Profile", "Owner Account", "Branches & Warehouses",
  "Product Catalogue", "Stock Alert Rules", "Credit Settings",
  "Report Settings", "SMS & Notifications", "Backup & Export", "User Roles"
];

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();

  const [profile, setProfile] = useState({
    companyName: "", phone: "", email: "", tin: "", location: "",
    smsCredit: true, smsLowStock: true, smsDaily: false, smsSenderId: "ASEDASTOCK",
  });

  useEffect(() => {
    if (settings) {
      setProfile({
        companyName: settings.companyName,
        phone: settings.phone,
        email: settings.email,
        tin: settings.tin,
        location: settings.location,
        smsCredit: settings.smsCredit,
        smsLowStock: settings.smsLowStock,
        smsDaily: settings.smsDaily,
        smsSenderId: settings.smsSenderId,
      });
    }
  }, [settings]);

  function handleSave() {
    updateSettings.mutate({ data: profile }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved", description: "Your business profile has been updated." });
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
    <div className="p-6 space-y-6 max-w-4xl" data-testid="page-settings">
      <div>
        <h1 className="text-2xl font-black text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business configuration and preferences</p>
      </div>

      {/* Settings nav */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map(s => (
          <button key={s} data-testid={`settings-section-${s.toLowerCase().replace(/\s+/g, "-")}`}
            className="rounded-xl border border-border bg-card hover:border-foreground/30 hover:bg-muted/30 transition-all p-4 text-left cursor-pointer">
            <p className="font-black text-foreground text-sm">{s}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Configure →</p>
          </button>
        ))}
      </div>

      {/* Business profile */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h2 className="text-xl font-black text-foreground mb-1">Business Profile</h2>
        <p className="text-sm text-muted-foreground mb-5">Your company information and details</p>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Company Name</label>
              <input data-testid="input-company-name" value={profile.companyName} onChange={e => setProfile(f => ({ ...f, companyName: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Business Phone</label>
              <input data-testid="input-business-phone" value={profile.phone} onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input data-testid="input-email" value={profile.email} onChange={e => setProfile(f => ({ ...f, email: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>TIN Number</label>
              <input data-testid="input-tin" value={profile.tin} onChange={e => setProfile(f => ({ ...f, tin: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Head Office Location</label>
              <input data-testid="input-location" value={profile.location} onChange={e => setProfile(f => ({ ...f, location: e.target.value }))} className={inputClass} />
            </div>
          </div>
        )}
        <div className="mt-5">
          <button
            data-testid="button-save-settings"
            onClick={handleSave}
            disabled={updateSettings.isPending || isLoading}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* SMS settings */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h2 className="text-xl font-black text-foreground mb-1">SMS & Notifications</h2>
        <p className="text-sm text-muted-foreground mb-5">Configure automatic alerts</p>
        <div className="space-y-3">
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
        </div>
        <div className="mt-4">
          <label className={labelClass}>SMS Sender ID</label>
          <input data-testid="input-sms-sender" value={profile.smsSenderId} onChange={e => setProfile(f => ({ ...f, smsSenderId: e.target.value }))} className={`${inputClass} max-w-xs`} />
        </div>
        <div className="mt-4">
          <button
            data-testid="button-save-sms"
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save SMS Settings
          </button>
        </div>
      </div>
    </div>
  );
}
