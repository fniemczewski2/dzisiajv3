// lib/prices/lookup.ts
//
// Szukanie ceny dla pozycji listy zakupów i podpowiedzi nazw (przepisy + katalog cen).

import type { ProductPrice } from "@/types/prices";
import { nameKey, comparePolish } from "./text";

/** Cena produktu pasującego do tekstu pozycji: dokładna nazwa albo najdłuższa nazwa, której wszystkie słowa są w tekście. */
export function lookupPrice(prices: readonly ProductPrice[], text: string): ProductPrice | undefined {
  const key = nameKey(text);
  if (!key) return undefined;
  const exact = prices.find((entry) => entry.name_key === key);
  if (exact) return exact;

  const words = new Set(key.split(" "));
  let best: ProductPrice | undefined;
  let bestLength = 0;
  for (const entry of prices) {
    const tokens = entry.name_key.split(" ");
    if (tokens.length <= bestLength) continue;
    if (tokens.every((token) => words.has(token)) && tokens.some((token) => token.length >= 3)) {
      best = entry;
      bestLength = tokens.length;
    }
  }
  return best;
}

/** Nazwy do autouzupełniania: produkty z przepisów i z katalogu cen, bez powtórzeń (ignorując wielkość liter i polskie znaki). */
export function suggestionNames(prices: readonly ProductPrice[], recipeProducts: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of [...prices.map((entry) => entry.name), ...recipeProducts]) {
    const key = nameKey(name);
    if (key && !seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort(comparePolish);
}
