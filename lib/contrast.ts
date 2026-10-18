// lib/contrast.ts
//
// Kontrast kolorów wg WCAG 2.x – do wyboru koloru tekstu na tle wybranym
// przez użytkownika (nastroje, kategorie) i do testów tokenów motywu.

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancja względna koloru #RRGGBB (0–1); null dla nieprawidłowego zapisu. */
export function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Współczynnik kontrastu dwóch kolorów (1–21); null dla nieprawidłowego zapisu. */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = "#FFFFFF";
const INK = "#101A26";

/** Biały albo prawie czarny tekst – ten, który ma większy kontrast z tłem. */
export function readableTextColor(background: string): string {
  const onWhite = contrastRatio(background, WHITE) ?? 0;
  const onInk = contrastRatio(background, INK) ?? 0;
  return onWhite >= onInk ? WHITE : INK;
}
