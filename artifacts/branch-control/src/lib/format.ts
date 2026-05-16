export const GHS = (v: number) =>
  `GH₵ ${Number(v || 0).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export const BRANCHES = ["Adenta", "Spintex", "Kasoa"] as const;
export const WAREHOUSES = ["Main Warehouse", "North Warehouse"] as const;
export const LOCATIONS = [...BRANCHES, ...WAREHOUSES] as const;
export const SUPPLIERS = ["Dangote", "Diamond Cement", "Buildmart", "PanTile Ltd", "SteelHub Ghana"];
export const PAYMENT_METHODS = ["Cash", "MoMo", "Bank", "Credit", "Split"];
