// lib/stopGroupKeys.ts

import type { StopGroup } from "@/types/transport";
import {
  favoriteKey,
  networkOf,
  normalizeStopName,
  type FavoriteStop,
} from "@/supabase/functions/_shared/stopGrouping";

function placeKey(group: Pick<StopGroup, "zone_id" | "stop_name">): string {
  return `${networkOf(group.zone_id)}:${normalizeStopName(group.stop_name ?? "")}`;
}

/**
 * Starsza wersja funkcji `transport-departures` nie zwraca pola `key`.
 * Bez niego ulubione nie pasują do żadnej grupy, a React dostaje zduplikowane
 * klucze. Uzupełniamy brakujący klucz tak samo, jak robi to aktualny serwer.
 */
export function withFavoriteKeys(groups: StopGroup[], favorites: FavoriteStop[]): StopGroup[] {
  return groups.map((group) => {
    if (group.key) return group;
    const place = placeKey(group);
    const match = favorites.find((fav) => `${networkOf(fav.zone_id)}:${normalizeStopName(fav.name)}` === place);
    return { ...group, key: match ? favoriteKey(match) : place };
  });
}

/** Grupy „w pobliżu”: brakujący klucz z kodu pierwszego słupka, a na koniec gwarancja unikalności. */
export function withNearbyKeys(groups: StopGroup[]): StopGroup[] {
  const seen = new Map<string, number>();
  return groups.map((group) => {
    const base = group.key || (group.stop_codes?.[0] ? `${networkOf(group.zone_id)}:${group.stop_codes[0]}` : placeKey(group));
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const key = count === 0 ? base : `${base}#${count}`;
    return key === group.key ? group : { ...group, key };
  });
}
