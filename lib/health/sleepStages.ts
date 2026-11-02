// lib/health/sleepStages.ts
//
// Fazy snu z Apple Zdrowie. Skróty zwracają nazwy w języku systemu („Głęboki”, „Podstawowy”, „REM”, „Przebudzenie”,
// „W łóżku”…), więc nazwy są normalizowane (bez wielkości liter i polskich znaków) do stałego zestawu.

export const SLEEP_STAGES = ["deep", "rem", "core", "asleep", "awake", "in_bed"] as const;
export type SleepStage = (typeof SLEEP_STAGES)[number];

export const SLEEP_STAGE_LABELS: Record<SleepStage, string> = {
  deep: "Sen głęboki",
  rem: "REM",
  core: "Sen podstawowy",
  asleep: "Sen (bez podziału na fazy)",
  awake: "Przebudzenia",
  in_bed: "W łóżku",
};

/** Fazy liczone jako sen (bez przebudzeń i czasu w łóżku). */
export const ASLEEP_STAGES: readonly SleepStage[] = ["deep", "rem", "core", "asleep"];

const ALIASES: Record<string, SleepStage> = {
  deep: "deep",
  asleepdeep: "deep",
  gleboki: "deep",
  glebokisen: "deep",
  rem: "rem",
  asleeprem: "rem",
  core: "core",
  asleepcore: "core",
  rdzen: "core",
  rdzeniowy: "core",
  podstawowy: "core",
  podstawowysen: "core",
  light: "core",
  lekki: "core",
  plytki: "core",
  asleep: "asleep",
  asleepunspecified: "asleep",
  unspecified: "asleep",
  nieokreslony: "asleep",
  nieokreslonysen: "asleep",
  spi: "asleep",
  sen: "asleep",
  awake: "awake",
  czuwanie: "awake",
  przebudzenie: "awake",
  przebudzony: "awake",
  obudzony: "awake",
  inbed: "in_bed",
  wlozku: "in_bed",
  lozku: "in_bed",
};

/** Wartości liczbowe HKCategoryValueSleepAnalysis. */
const NUMERIC: Record<number, SleepStage> = { 0: "in_bed", 1: "asleep", 2: "awake", 3: "core", 4: "deep", 5: "rem" };

function key(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll("ł", "l")
    .replaceAll(/[^a-z0-9]/g, "");
}

/** Faza snu z nazwy lub liczby ze Skrótu; null – nieznana. */
export function normalizeSleepStage(raw: unknown): SleepStage | null {
  if (typeof raw === "number") return NUMERIC[raw] ?? null;
  if (typeof raw !== "string") return null;
  // Identyfikatory HealthKit (np. „HKCategoryValueSleepAnalysisAsleepDeep”) bez wspólnego przedrostka.
  const k = key(raw).replace("hkcategoryvaluesleepanalysis", "");
  if (/^\d$/.test(k)) return NUMERIC[Number(k)] ?? null;
  return ALIASES[k] ?? null;
}
