// lib/health/manualWorkout.ts
//
// Ręcznie dodany trening: walidacja formularza i wiersz do zapisu (source = "manual").

import { toNumber } from "@/lib/health/shortcutPayload";
import { warsawInstant } from "@/lib/health/time";

export interface ManualWorkoutForm {
  activity: string;
  date: string;
  time: string;
  durationMinutes: string;
  distanceKm: string;
  energyKcal: string;
  avgHeartRate: string;
}

export interface ManualWorkoutRow {
  activity: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  distance_km: number | null;
  energy_kcal: number | null;
  heart_rate_avg: number | null;
  source: "manual";
}

export type ManualWorkoutResult = { ok: true; row: ManualWorkoutRow } | { ok: false; error: string };

/** Podpowiedzi rodzaju treningu (pole tekstowe pozwala wpisać własny). */
export const WORKOUT_SUGGESTIONS = [
  "Bieg",
  "Spacer",
  "Marsz",
  "Rower",
  "Pływanie",
  "Siłownia",
  "Joga",
  "Wspinaczka",
] as const;

export const emptyManualWorkout = (date: string): ManualWorkoutForm => ({
  activity: "",
  date,
  time: "",
  durationMinutes: "",
  distanceKm: "",
  energyKcal: "",
  avgHeartRate: "",
});

type Field = { value: number | null } | { error: string };

/** Pole liczbowe: puste = brak wartości; poza zakresem lub nie-liczba = błąd z nazwą pola. */
function numberField(raw: string, label: string, min: number, max: number, decimals: number): Field {
  const n = toNumber(raw.trim());
  if (n === undefined) return { value: null };
  if (n === null || n < min || n > max) return { error: `${label}: wartość od ${min} do ${max}.` };
  const factor = 10 ** decimals;
  return { value: Math.round(n * factor) / factor };
}

export function buildManualWorkout(form: ManualWorkoutForm): ManualWorkoutResult {
  const activity = form.activity.trim().slice(0, 60);
  if (!activity) return { ok: false, error: "Podaj rodzaj treningu." };
  if (!form.time) return { ok: false, error: "Podaj godzinę rozpoczęcia." };
  const startedAt = warsawInstant(form.date, form.time);
  if (!startedAt) return { ok: false, error: "Niepoprawna data lub godzina rozpoczęcia." };

  const duration = numberField(form.durationMinutes, "Czas trwania (min)", 1, 1440, 0);
  const distance = numberField(form.distanceKm, "Dystans (km)", 0, 10_000, 2);
  const energy = numberField(form.energyKcal, "Energia (kcal)", 0, 20_000, 0);
  const heartRate = numberField(form.avgHeartRate, "Średnie tętno (bpm)", 20, 250, 0);
  for (const field of [duration, distance, energy, heartRate])
    if ("error" in field) return { ok: false, error: field.error };
  if (!("value" in duration) || duration.value === null) return { ok: false, error: "Podaj czas trwania w minutach." };

  const value = (f: Field) => ("value" in f ? f.value : null);
  return {
    ok: true,
    row: {
      activity,
      started_at: startedAt,
      ended_at: new Date(Date.parse(startedAt) + duration.value * 60_000).toISOString(),
      duration_minutes: duration.value,
      distance_km: value(distance),
      energy_kcal: value(energy),
      heart_rate_avg: value(heartRate),
      source: "manual",
    },
  };
}
