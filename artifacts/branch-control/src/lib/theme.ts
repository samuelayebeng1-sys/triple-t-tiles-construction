export function hexToHslValues(hex: string): string {
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

function isValidHex(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export function applyAccentColor(hex: string) {
  if (!isValidHex(hex)) return;
  const hsl = hexToHslValues(hex);
  document.documentElement.style.setProperty("--primary", hsl);
  document.documentElement.style.setProperty("--sidebar-primary", hsl);
  document.documentElement.style.setProperty("--sidebar-primary-foreground", "210 40% 98%");
  document.documentElement.style.setProperty("--ring", hsl);
}

export function applyLoginGlowColor(hex: string) {
  if (!isValidHex(hex)) return;
  document.documentElement.style.setProperty("--login-glow", hex);
}

export function applyContentBarColor(hex: string) {
  if (!isValidHex(hex)) return;
  document.documentElement.style.setProperty("--content-bar", hex);
}

export function applyAllColors(accentColor: string, loginGlowColor: string, contentBarColor: string) {
  applyAccentColor(accentColor);
  applyLoginGlowColor(loginGlowColor);
  applyContentBarColor(contentBarColor);
}
