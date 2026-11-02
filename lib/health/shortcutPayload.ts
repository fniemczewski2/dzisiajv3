// lib/health/shortcutPayload.ts
//
// Walidacja danych ze Skrótów iOS (Apple Zdrowie). Skróty wysyłają liczby także jako tekst z przecinkiem
// („6,2”), dlatego wartości liczbowe są normalizowane. Brak pola = brak zmiany (zapis częściowy),
// więc osobne automatyzacje (np. sen rano, kroki wieczorem) nie nadpisują się nawzajem.

import { MAX_HEALTH_WORKOUTS_PER_SUBMIT } from "@/config/limits";

export interface HealthDailyInput {
  date: string;
  steps?: number;
  heart_rate_avg?: number;
  heart_rate_min?: number;
  heart_rate_max?: number;
  heart_rate_resting?: number;
  sleep_minutes?: number;
}

export interface HealthWorkoutInput {
  activity: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  energy_kcal: number | null;
  heart_rate_avg: number | null;
}

export type ParsedHealthPayload =
  { ok: true; daily: HealthDailyInput; workouts: HealthWorkoutInput[] } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const THOUSANDS_SEPARATORS = /[\s\u00a0\u202f]/g;
const LEADING_NUMBER = /^-?\d+(?:[.,]\d+)?/;

/**
 * Liczba z wartości liczbowej albo tekstu ze Skrótów: „6,2”, „8 423”, także z jednostką z Apple Zdrowie
 * („8 423 kroki”, „72 uderz./min”, „431,5 min”). undefined = brak; null = brak liczby na początku.
 */
export function toNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const compact = value.trim().replaceAll(THOUSANDS_SEPARATORS, "");
  const match = LEADING_NUMBER.exec(compact);
  if (!match) return null;
  const rest = compact.slice(match[0].length);
  // Po liczbie dopuszczamy wyłącznie jednostkę (litery, „/”, „.”, „%”) – nie kolejne cyfry.
  if (/\d/.test(rest)) return null;
  return Number(match[0].replace(",", "."));
}

function inRange(value: number | null | undefined, min: number, max: number, round = true) {
  if (value === undefined) return { ok: true as const, value: undefined };
  if (value === null || value < min || value > max) return { ok: false as const };
  return { ok: true as const, value: round ? Math.round(value) : Math.round(value * 100) / 100 };
}

function validDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isoInstant(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function parseWorkout(item: unknown): HealthWorkoutInput | string {
  if (!item || typeof item !== "object") return "Nieprawidłowy trening.";
  const w = item as Record<string, unknown>;
  const activity = typeof w.type === "string" ? w.type.trim().slice(0, 60) : "";
  const started = isoInstant(w.start);
  if (!activity || !started) return "Trening wymaga pól „type” i „start” (ISO 8601).";
  const ended = w.end === undefined ? null : isoInstant(w.end);
  if (w.end !== undefined && (!ended || ended < started)) return "Niepoprawne pole „end” treningu.";
  const duration = inRange(toNumber(w.durationMinutes), 0, 1440);
  const distance = inRange(toNumber(w.distanceKm), 0, 10_000, false);
  const energy = inRange(toNumber(w.energyKcal), 0, 20_000);
  const avgHr = inRange(toNumber(w.avgHeartRate), 20, 250);
  if (!duration.ok || !distance.ok || !energy.ok || !avgHr.ok) return "Niepoprawne wartości liczbowe treningu.";
  return {
    activity,
    started_at: started,
    ended_at: ended,
    duration_minutes: duration.value ?? null,
    distance_km: distance.value ?? null,
    energy_kcal: energy.value ?? null,
    heart_rate_avg: avgHr.value ?? null,
  };
}

function parseDaily(b: Record<string, unknown>): HealthDailyInput | string {
  const daily: HealthDailyInput = { date: b.date as string };
  const hr = (b.heartRate && typeof b.heartRate === "object" ? b.heartRate : {}) as Record<string, unknown>;
  const fields: [Exclude<keyof HealthDailyInput, "date">, unknown, number, number][] = [
    ["steps", b.steps, 0, 200_000],
    ["sleep_minutes", b.sleepMinutes, 0, 1440],
    ["heart_rate_avg", hr.avg, 20, 250],
    ["heart_rate_min", hr.min, 20, 250],
    ["heart_rate_max", hr.max, 20, 250],
    ["heart_rate_resting", hr.resting, 20, 250],
  ];
  for (const [key, raw, min, max] of fields) {
    const checked = inRange(toNumber(raw), min, max);
    if (!checked.ok) return `Niepoprawna wartość pola ${key}.`;
    if (checked.value !== undefined) daily[key] = checked.value;
  }
  return daily;
}

function parseWorkouts(raw: unknown): HealthWorkoutInput[] | string {
  const list = raw ?? [];
  if (!Array.isArray(list)) return "Pole „workouts” musi być listą.";
  if (list.length > MAX_HEALTH_WORKOUTS_PER_SUBMIT)
    return `Najwyżej ${MAX_HEALTH_WORKOUTS_PER_SUBMIT} treningów w jednym wysłaniu.`;
  const workouts: HealthWorkoutInput[] = [];
  for (const item of list) {
    const parsed = parseWorkout(item);
    if (typeof parsed === "string") return parsed;
    workouts.push(parsed);
  }
  return workouts;
}

export function parseHealthPayload(body: unknown): ParsedHealthPayload {
  if (!body || typeof body !== "object") return { ok: false, error: "Nieprawidłowe dane." };
  const b = body as Record<string, unknown>;
  if (typeof b.date !== "string" || !validDate(b.date)) {
    return { ok: false, error: "Pole „date” musi mieć format RRRR-MM-DD." };
  }
  const daily = parseDaily(b);
  if (typeof daily === "string") return { ok: false, error: daily };
  const workouts = parseWorkouts(b.workouts);
  if (typeof workouts === "string") return { ok: false, error: workouts };
  if (Object.keys(daily).length === 1 && workouts.length === 0)
    return { ok: false, error: "Brak danych do zapisania." };
  return { ok: true, daily, workouts };
}
