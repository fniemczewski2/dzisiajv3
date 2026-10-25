// lib/habits.ts
//
// Własne nawyki: do 8, każdy z nazwą i ikoną. Dawne 8 stałych nawyków
// (kolumny pills…duolingo i przełączniki habit_*) to teraz po prostu
// domyślna lista – ich identyfikatory zostają te same, więc historia
// odhaczeń przechodzi bez utraty danych.

import { MAX_HABIT_LABEL, MAX_HABITS } from "@/config/limits";
import type { DailyHabitsRow, HabitDef, HabitKey } from "@/types/habits";
import type { Settings } from "@/types/settings";

/** Ikony do wyboru (nazwy komponentów lucide-react) z polskimi nazwami dla czytników. */
export const HABIT_ICON_NAMES: Record<string, string> = {
  Pill: "tabletka",
  Bath: "wanna",
  Dumbbell: "hantla",
  Users: "ludzie",
  Briefcase: "teczka",
  Home: "dom",
  Leaf: "liść",
  Languages: "języki",
  BookOpen: "książka",
  Droplets: "krople",
  Footprints: "kroki",
  Bike: "rower",
  Moon: "księżyc",
  Sun: "słońce",
  Coffee: "kawa",
  Apple: "jabłko",
  Brain: "mózg",
  Heart: "serce",
  Music: "muzyka",
  PenLine: "pióro",
  Phone: "telefon",
  PiggyBank: "skarbonka",
  Sparkles: "iskry",
  Smile: "uśmiech",
};

export const LEGACY_HABITS: ReadonlyArray<HabitDef & { id: HabitKey }> = [
  { id: "pills", label: "Leki", icon: "Pill" },
  { id: "bath", label: "Higiena", icon: "Bath" },
  { id: "workout", label: "Trening", icon: "Dumbbell" },
  { id: "friends", label: "Relacje", icon: "Users" },
  { id: "work", label: "Praca / rozwój", icon: "Briefcase" },
  { id: "housework", label: "Dom / porządki", icon: "Home" },
  { id: "plants", label: "Higiena cyfrowa", icon: "Leaf" },
  { id: "duolingo", label: "Języki obce", icon: "Languages" },
];

const LEGACY_IDS = new Set<string>(LEGACY_HABITS.map((h) => h.id));

export function isLegacyHabitId(id: string): id is HabitKey {
  return LEGACY_IDS.has(id);
}

export function normalizeHabits(raw: unknown): HabitDef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: HabitDef[] = [];
  for (const item of raw) {
    const h = item as Partial<HabitDef>;
    const id = typeof h?.id === "string" ? h.id.trim().slice(0, 40) : "";
    const label = typeof h?.label === "string" ? h.label.replaceAll(/\s+/g, " ").trim().slice(0, MAX_HABIT_LABEL) : "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, label, icon: typeof h.icon === "string" && h.icon in HABIT_ICON_NAMES ? h.icon : "Sparkles" });
    if (result.length >= MAX_HABITS) break;
  }
  return result;
}

/** Nawyki użytkownika: własna lista albo (domyślnie) włączone dawne nawyki. */
export function resolveHabits(settings: Pick<Settings, "custom_habits"> & Partial<Settings>): HabitDef[] {
  if (Array.isArray(settings.custom_habits)) return normalizeHabits(settings.custom_habits);
  return LEGACY_HABITS.filter((h) => settings[`habit_${h.id}` as keyof Settings] !== false).map((h) => ({ ...h }));
}

/** Czy nawyk jest odhaczony w danym dniu (nowe pole, a dla starszych wpisów – kolumna). */
export function isHabitDone(row: DailyHabitsRow | null | undefined, id: string): boolean {
  if (!row) return false;
  const fromMap = row.habits_done?.[id];
  if (typeof fromMap === "boolean") return fromMap;
  return isLegacyHabitId(id) ? Boolean(row[id]) : false;
}

export function newHabitId(): string {
  // Id nawyku nie musi być nieprzewidywalny, ale randomUUID jest dostępny wszędzie
  // (przeglądarka, Node 19+) i nie budzi wątpliwości co do jakości losowania.
  return `h_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
