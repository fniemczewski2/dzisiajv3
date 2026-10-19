// lib/settings.ts
//
// Zamiana wiersza `settings` z bazy na obiekt ustawień (wartości domyślne,
// normalizacja pól JSON). Bez Reacta – używane przez SettingsProvider i testy.

import { DEFAULT_MOODS, DEFAULT_SETTINGS } from "@/config/defaults";
import type { FavoriteStop } from "@/shared/stopGrouping";
import { normalizeCategoryColors } from "@/lib/categoryColors";
import { normalizeDisabledModules } from "@/config/modules";
import { normalizeHabits } from "@/lib/habits";
import { normalizeCustomFeeds } from "@/config/rssSources";
import { normalizeTemplateSet } from "@/lib/reportTemplate";
import type { MoodOption } from "@/types/moods";
import type { Settings } from "@/types/settings";

const safeParseArray = <T = unknown>(data: unknown): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn("[settings] Nie udało się odczytać listy z ustawień:", data);
      return [];
    }
  }
  return [];
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const normalizeFavoriteStops = (data: unknown): FavoriteStop[] => {
  const parsed = safeParseArray<string | Partial<FavoriteStop>>(data);
  return parsed
    .map((item): FavoriteStop => {
      if (typeof item === "string") return { name: item, zone_id: "AUTO" };
      const fav: FavoriteStop = { name: item?.name || "", zone_id: item?.zone_id || "AUTO" };
      if (isNum(item?.lat) && isNum(item?.lon)) {
        fav.lat = item.lat;
        fav.lon = item.lon;
      }
      if (Array.isArray(item?.stop_codes)) {
        fav.stop_codes = item.stop_codes.filter((c): c is string => typeof c === "string").slice(0, 50);
      }
      if (typeof item?.locality === "string" && item.locality) fav.locality = item.locality.slice(0, 80);
      return fav;
    })
    .filter((item) => item.name !== "");
};

const arrayOrNull = <T>(value: unknown, normalize: (v: unknown[]) => T[]): T[] | null =>
  Array.isArray(value) ? normalize(value) : null;

/**
 * Wiersz z bazy → ustawienia: brakujące i puste wartości biorą domyślne,
 * pola złożone przechodzą przez normalizację.
 */
export function settingsFromRow(data: Record<string, unknown>): Settings {
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (data[key] !== null && data[key] !== undefined) merged[key] = data[key];
  }
  return {
    ...(merged as unknown as Settings),
    users: safeParseArray(data.users),
    favorite_stops: normalizeFavoriteStops(data.favorite_stops),
    mood_options: data.mood_options ? safeParseArray<MoodOption>(data.mood_options) : DEFAULT_MOODS,
    task_categories: arrayOrNull(data.task_categories, (v) => v as string[]),
    category_colors: data.category_colors ? normalizeCategoryColors(data.category_colors) : null,
    disabled_modules: arrayOrNull(data.disabled_modules, normalizeDisabledModules),
    custom_habits: arrayOrNull(data.custom_habits, normalizeHabits),
    rss_sources: arrayOrNull(data.rss_sources, (v) => v.filter((x): x is string => typeof x === "string")),
    rss_custom: arrayOrNull(data.rss_custom, normalizeCustomFeeds),
    report_template: data.report_template ? normalizeTemplateSet(data.report_template) : null,
    daily_spending_categories: arrayOrNull(data.daily_spending_categories, (v) =>
      v.filter((x): x is string => typeof x === "string")
    ),
  };
}
