// lib/reportColors.ts
//
// Kolory PDF protokołu wyprowadzone z jednego koloru nagłówków wybranego
// przez użytkownika: nagłówki i numeracja w tym kolorze, tekst prawie czarny
// z odrobiną tego odcienia, linie tabeli jako jasny odcień. Zbyt jasny kolor
// przyciemniamy do kontrastu 4.5:1 na białym, żeby nagłówki były czytelne.

export const DEFAULT_HEADING_COLOR = "#0A2947";

export interface ReportPalette {
  /** Nagłówki, tytuł, numeracja, nagłówek tabeli. */
  heading: string;
  /** Tekst główny. */
  ink: string;
  /** Tekst pomocniczy (data, puste sekcje, stopka). */
  muted: string;
  /** Linie oddzielające wiersze tabeli. */
  rule: string;
  /** Linia pod nagłówkiem tabeli. */
  ruleStrong: string;
}

type Rgb = [number, number, number];

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function toRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Mieszanka a→b; t = udział koloru b (0–1). */
export function mix(a: string, b: string, t: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/** Przyciemnia kolor (mieszając z czernią), aż osiągnie wymagany kontrast z bielą. */
export function ensureReadable(hex: string, minContrast = 4.5): string {
  let color = hex.toUpperCase();
  for (let i = 0; i < 20 && contrastOnWhite(color) < minContrast; i++) color = mix(color, "#000000", 0.1);
  return color;
}

export function derivePalette(headingColor?: string | null): ReportPalette {
  const heading = ensureReadable(isHexColor(headingColor) ? headingColor : DEFAULT_HEADING_COLOR);
  return {
    heading,
    ink: mix(heading, "#000000", 0.82),
    muted: ensureReadable(mix(heading, "#6E6E6E", 0.75)),
    rule: mix(heading, "#FFFFFF", 0.85),
    ruleStrong: heading,
  };
}
