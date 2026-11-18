// lib/prices/catalog.ts
//
// Łączenie nowych cen z katalogiem. Katalog nie przechowuje pojedynczych paragonów, tylko średnią i liczbę wystąpień;
// nowa cena wchodzi do średniej ważonej, chyba że różni się od średniej o więcej niż próg (wtedy decyduje użytkownik).

import { PRICE_CHANGE_THRESHOLD } from "@/config/limits";
import type { ConflictDecision } from "@/types/prices";
import { roundTo } from "./text";

export interface PriceStat {
  avg_price: number;
  occurrences: number;
}

/** Względna różnica ceny od średniej (0,25 = 25%). Dla średniej 0 każda dodatnia cena to zmiana 100%. */
export function relativeChange(average: number, price: number): number {
  if (average <= 0) return price > 0 ? 1 : 0;
  return Math.abs(price - average) / average;
}

/** Czy przy tej cenie trzeba zapytać użytkownika (istnieje średnia, a zmiana przekracza próg). */
export function needsDecision(existing: PriceStat | undefined, price: number): boolean {
  return Boolean(existing) && relativeChange(existing!.avg_price, price) > PRICE_CHANGE_THRESHOLD;
}

/**
 * Nowy stan katalogu po jednej obserwacji ceny (`count` wystąpień po cenie `price`).
 * Brak wpisu: tworzy go. Decyzja dotyczy tylko zmian powyżej progu; poniżej progu zawsze liczymy średnią ważoną.
 */
export function mergePrice(
  existing: PriceStat | undefined,
  observation: { price: number; count?: number },
  decision: ConflictDecision = "keep"
): PriceStat {
  const count = Math.max(1, Math.trunc(observation.count ?? 1));
  if (!existing) return { avg_price: roundTo(observation.price, 4), occurrences: count };

  const effective: ConflictDecision = needsDecision(existing, observation.price) ? decision : "average";
  if (effective === "keep") return { ...existing };
  if (effective === "overwrite") return { avg_price: roundTo(observation.price, 4), occurrences: count };

  const total = existing.occurrences + count;
  const weighted = (existing.avg_price * existing.occurrences + observation.price * count) / total;
  return { avg_price: roundTo(weighted, 4), occurrences: total };
}
