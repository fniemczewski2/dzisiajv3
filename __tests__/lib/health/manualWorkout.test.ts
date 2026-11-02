// __tests__/lib/health/manualWorkout.test.ts

import { describe, it, expect } from "vitest";
import { buildManualWorkout, emptyManualWorkout, type ManualWorkoutForm } from "@/lib/health/manualWorkout";

const valid: ManualWorkoutForm = {
  activity: " Bieg ",
  date: "2026-11-02",
  time: "07:10",
  durationMinutes: "45",
  distanceKm: "6,5",
  energyKcal: "400",
  avgHeartRate: "150",
};

describe("buildManualWorkout", () => {
  it("poprawny formularz: wiersz z czasem UTC, końcem z czasu trwania i źródłem „manual”", () => {
    expect(buildManualWorkout(valid)).toEqual({
      ok: true,
      row: {
        activity: "Bieg",
        started_at: "2026-11-02T06:10:00.000Z",
        ended_at: "2026-11-02T06:55:00.000Z",
        duration_minutes: 45,
        distance_km: 6.5,
        energy_kcal: 400,
        heart_rate_avg: 150,
        source: "manual",
      },
    });
  });

  it("czas letni (UTC+2) i pola opcjonalne puste", () => {
    const r = buildManualWorkout({ ...valid, date: "2026-07-01", distanceKm: "", energyKcal: " ", avgHeartRate: "" });
    expect(r).toMatchObject({
      ok: true,
      row: { started_at: "2026-07-01T05:10:00.000Z", distance_km: null, energy_kcal: null, heart_rate_avg: null },
    });
  });

  it("dystans z kropką i z jednostką, zaokrąglony do 0,01", () => {
    expect(buildManualWorkout({ ...valid, distanceKm: "6.456 km" })).toMatchObject({
      ok: true,
      row: { distance_km: 6.46 },
    });
  });

  it.each([
    [{ activity: "  " }, "Podaj rodzaj treningu."],
    [{ time: "" }, "Podaj godzinę rozpoczęcia."],
    [{ date: "2026-02-30" }, "Niepoprawna data lub godzina rozpoczęcia."],
    [{ durationMinutes: "" }, "Podaj czas trwania w minutach."],
    [{ durationMinutes: "0" }, "Czas trwania (min): wartość od 1 do 1440."],
    [{ durationMinutes: "2000" }, "Czas trwania (min): wartość od 1 do 1440."],
    [{ distanceKm: "abc" }, "Dystans (km): wartość od 0 do 10000."],
    [{ energyKcal: "-5" }, "Energia (kcal): wartość od 0 do 20000."],
    [{ avgHeartRate: "10" }, "Średnie tętno (bpm): wartość od 20 do 250."],
  ])("odrzuca %j", (override, error) => {
    expect(buildManualWorkout({ ...valid, ...override })).toEqual({ ok: false, error });
  });

  it("nazwa treningu przycięta do 60 znaków", () => {
    const r = buildManualWorkout({ ...valid, activity: "x".repeat(100) });
    expect(r.ok && r.row.activity).toHaveLength(60);
  });
});

describe("emptyManualWorkout", () => {
  it("domyślna data, reszta pusta", () => {
    expect(emptyManualWorkout("2026-11-02")).toEqual({
      activity: "",
      date: "2026-11-02",
      time: "",
      durationMinutes: "",
      distanceKm: "",
      energyKcal: "",
      avgHeartRate: "",
    });
  });
});
