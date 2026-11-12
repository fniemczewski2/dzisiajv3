// lib/health/shortcutPayload.ts
//
// Walidacja danych ze Skrótów iOS (Apple Zdrowie). Skróty wysyłają liczby także jako tekst z przecinkiem
// („6,2”), dlatego wartości liczbowe są normalizowane. Brak pola = brak zmiany (zapis częściowy),
// więc osobne automatyzacje (np. sen rano, kroki wieczorem) nie nadpisują się nawzajem.

import {
  MAX_HEALTH_HEART_RATE_SAMPLES_PER_SUBMIT,
  MAX_HEALTH_SLEEP_SEGMENTS_PER_SUBMIT,
  MAX_HEALTH_WORKOUTS_PER_SUBMIT,
} from "@/config/limits";
import { normalizeSleepStage, type SleepStage } from "@/lib/health/sleepStages";
import { thinHeartRateSamples } from "@/lib/health/heartRateThinning";

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

export interface HeartRateSampleInput {
  recorded_at: string;
  bpm: number;
}

export interface SleepSegmentInput {
  stage: SleepStage;
  started_at: string;
  ended_at: string;
}

export type ParsedHealthPayload =
  | {
      ok: true;
      daily: HealthDailyInput;
      workouts: HealthWorkoutInput[];
      heartRateSamples: HeartRateSampleInput[];
      sleepSegments: SleepSegmentInput[];
    }
  | { ok: false; error: string };

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

/** Dane zdrowotne z lat 2000–2100; inne daty to zwykle błąd skrótu (np. liczba sekund sformatowana jako data z roku 1). */
const MIN_INSTANT_MS = Date.UTC(2000, 0, 1);
const MAX_INSTANT_MS = Date.UTC(2100, 0, 1);

function isoInstant(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) || ms < MIN_INSTANT_MS || ms >= MAX_INSTANT_MS ? null : new Date(ms).toISOString();
}

/**
 * Lista ze Skrótu: tablica JSON, tekst z tablicą JSON, tekst z obiektami oddzielonymi nową linią („{…}\n{…}” – tak Skróty
 * zamieniają listę słowników na tekst) albo pojedynczy obiekt. Pusty tekst to brak danych; inne wartości bez zmian.
 */
function asList(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return [raw];
  if (typeof raw !== "string") return raw;
  const text = raw.trim();
  if (text === "") return [];
  try {
    const parsed: unknown = JSON.parse(text.startsWith("[") ? text : `[${text.replaceAll(/}\s*{/g, "},{")}]`);
    return Array.isArray(parsed) ? parsed : raw;
  } catch {
    return raw;
  }
}

/** Czas trwania z początku i końca (minuty), gdy Skrót go nie przesłał; null przy braku końca lub wyniku poza dobą. */
function derivedDuration(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) return null;
  const minutes = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000);
  return minutes >= 0 && minutes <= 1440 ? minutes : null;
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
    duration_minutes: duration.value ?? derivedDuration(started, ended),
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

/** Duplikaty w jednym wysłaniu (ten sam klucz) skracamy do ostatniego – inaczej zapis zbiorczy kończy się błędem bazy. */
function lastByKey<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item] as const)).values()];
}

function parseWorkouts(raw: unknown): HealthWorkoutInput[] | string {
  const list = asList(raw) ?? [];
  if (!Array.isArray(list)) return notListError("workouts", raw);
  if (list.length > MAX_HEALTH_WORKOUTS_PER_SUBMIT) {
    return `Najwyżej ${MAX_HEALTH_WORKOUTS_PER_SUBMIT} treningów w jednym wysłaniu.`;
  }
  const workouts: HealthWorkoutInput[] = [];
  for (const item of list) {
    const parsed = parseWorkout(item);
    if (typeof parsed === "string") return parsed;
    workouts.push(parsed);
  }
  return lastByKey(workouts, (w) => `${w.started_at}|${w.activity}`);
}

/** Rejestr tętna: lista { time (ISO 8601), bpm }. */
function parseHeartRateSamples(raw: unknown): HeartRateSampleInput[] | string {
  const list = asList(raw);
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) return notListError("heartRateSamples", raw);
  if (list.length > MAX_HEALTH_HEART_RATE_SAMPLES_PER_SUBMIT) {
    return `Najwyżej ${MAX_HEALTH_HEART_RATE_SAMPLES_PER_SUBMIT} pomiarów tętna w jednym wysłaniu.`;
  }
  const samples: HeartRateSampleInput[] = [];
  for (const [index, item] of list.entries()) {
    const sample = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const recordedAt = isoInstant(sample.time);
    const bpm = inRange(toNumber(sample.bpm), 20, 250);
    if (!recordedAt || !bpm.ok || bpm.value === undefined) {
      return `Niepoprawny pomiar tętna nr ${index + 1} (wymagane „time” w ISO 8601, rok 2000-2100, i „bpm” 20-250).`;
    }
    samples.push({ recorded_at: recordedAt, bpm: bpm.value });
  }
  return lastByKey(samples, (s) => s.recorded_at);
}

const MAX_SLEEP_SEGMENT_MS = 24 * 3_600_000;

/** Fazy snu: lista { stage, start, end }; nazwy faz jak w Apple Zdrowie (polskie i angielskie). */
function parseSleepSegments(raw: unknown): SleepSegmentInput[] | string {
  const list = asList(raw);
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) return notListError("sleepSegments", raw);
  if (list.length > MAX_HEALTH_SLEEP_SEGMENTS_PER_SUBMIT) {
    return `Najwyżej ${MAX_HEALTH_SLEEP_SEGMENTS_PER_SUBMIT} odcinków snu w jednym wysłaniu.`;
  }
  const segments: SleepSegmentInput[] = [];
  for (const [index, item] of list.entries()) {
    const segment = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const stage = normalizeSleepStage(segment.stage);
    if (!stage) {
      const shown = typeof segment.stage === "string" ? segment.stage.slice(0, 40) : "brak";
      return `Nieznana faza snu „${shown}” w odcinku nr ${index + 1}.`;
    }
    const start = isoInstant(segment.start);
    const end = isoInstant(segment.end);
    if (!start || !end || end <= start || Date.parse(end) - Date.parse(start) > MAX_SLEEP_SEGMENT_MS) {
      return `Niepoprawny czas odcinka snu nr ${index + 1} („start” i „end” w ISO 8601, rok 2000-2100, koniec po początku, do 24 h).`;
    }
    segments.push({ stage, started_at: start, ended_at: end });
  }
  return lastByKey(segments, (s) => `${s.started_at}|${s.stage}`);
}

const NON_LIST_TYPES: Record<string, string> = { number: "liczbę", boolean: "wartość logiczną" };

/**
 * Komunikat dla pola, które nie jest listą. Podaje tylko typ, długość i pierwszy znak – bez treści (dane o zdrowiu
 * nie trafiają do odpowiedzi ani logów), a wystarcza do rozpoznania błędu w skrócie (np. wpisany tekst zamiast zmiennej).
 */
function notListError(field: string, raw: unknown): string {
  const base = `Pole „${field}” musi być listą`;
  if (typeof raw === "string") {
    return `${base} (otrzymano tekst: ${raw.length} znaków, zaczyna się od „${raw.trim().slice(0, 1)}”, nie jest poprawnym JSON-em).`;
  }
  return `${base} (otrzymano ${NON_LIST_TYPES[typeof raw] ?? "nieobsługiwany typ"}).`;
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
  const heartRateSamples = parseHeartRateSamples(b.heartRateSamples);
  if (typeof heartRateSamples === "string") return { ok: false, error: heartRateSamples };
  const sleepSegments = parseSleepSegments(b.sleepSegments);
  if (typeof sleepSegments === "string") return { ok: false, error: sleepSegments };
  const nothing =
    Object.keys(daily).length === 1 && [workouts, heartRateSamples, sleepSegments].every((list) => list.length === 0);
  if (nothing) return { ok: false, error: "Brak danych do zapisania." };
  // Tętno: najwyżej jeden pomiar na 15 minut (ogranicza ilość zapisywanych danych).
  return { ok: true, daily, workouts, heartRateSamples: thinHeartRateSamples(heartRateSamples), sleepSegments };
}
