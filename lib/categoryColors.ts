// lib/categoryColors.ts
//
// Kolory kategorii. Paleta jest zamknięta (bez dowolnego HEX-a), bo na
// pasku wydarzenia w kalendarzu leży biały tekst: każdy kolor ma kontrast
// co najmniej 4.5:1 z bielą (WCAG 1.4.3). Kolor nigdy nie jest jedynym
// nośnikiem informacji – nazwa kategorii jest zawsze w tekście lub etykiecie.

export interface PaletteColor {
  /** Wartość zapisywana w bazie. */
  value: string;
  /** Nazwa odczytywana przez czytnik ekranu i pokazywana w podpowiedzi. */
  name: string;
}

export const CATEGORY_PALETTE: readonly PaletteColor[] = [
  { value: "#1D5FB0", name: "niebieski" }, // 6.3:1 z bielą
  { value: "#0F7B6C", name: "zielony" }, // 5.2:1
  { value: "#5B6B12", name: "oliwkowy" }, // 5.9:1
  { value: "#8A530C", name: "miodowy" }, // 6.3:1
  { value: "#A74B07", name: "pomarańczowy" }, // 5.8:1
  { value: "#B83232", name: "czerwony" }, // 5.9:1
  { value: "#B0316F", name: "różowy" }, // 6.0:1
  { value: "#644CAA", name: "fioletowy" }, // 6.7:1
  { value: "#06606E", name: "morski" }, // 7.2:1
  { value: "#4A5A6D", name: "grafitowy" }, // 7.1:1
];

const PALETTE_VALUES = new Set(CATEGORY_PALETTE.map((c) => c.value.toUpperCase()));

export function isPaletteColor(value: unknown): value is string {
  return typeof value === "string" && PALETTE_VALUES.has(value.toUpperCase());
}

export function paletteColorName(value: string | null | undefined): string | null {
  if (!value) return null;
  return CATEGORY_PALETTE.find((c) => c.value.toUpperCase() === value.toUpperCase())?.name ?? null;
}

/** Oczyszcza zapis z bazy: tylko znane nazwy i kolory z palety. */
export function normalizeCategoryColors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [name, color] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof name === "string" && name.trim() && isPaletteColor(color)) result[name] = color;
  }
  return result;
}

/** Po zmianie nazwy kategorii kolor przechodzi na nową nazwę; usunięte kategorie tracą kolor. */
export function remapCategoryColors(
  colors: Readonly<Record<string, string>>,
  renames: ReadonlyArray<readonly [string, string]>,
  keep: readonly string[]
): Record<string, string> {
  const next: Record<string, string> = { ...colors };
  for (const [from, to] of renames) {
    if (from in next) {
      next[to] = next[from];
      delete next[from];
    }
  }
  const keepSet = new Set(keep);
  for (const name of Object.keys(next)) if (!keepSet.has(name)) delete next[name];
  return next;
}
