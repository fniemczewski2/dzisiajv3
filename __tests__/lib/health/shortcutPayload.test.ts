// __tests__/lib/health/shortcutPayload.test.ts

import { describe, it, expect } from "vitest";
import { parseHealthPayload, toNumber } from "@/lib/health/shortcutPayload";

describe("toNumber – wartości ze Skrótów", () => {
  it("liczby, tekst z przecinkiem i spacjami; brak = undefined; śmieci = null", () => {
    expect(toNumber(8423)).toBe(8423);
    expect(toNumber("6,2")).toBe(6.2);
    expect(toNumber("8 423")).toBe(8423);
    expect(toNumber("")).toBeUndefined();
    expect(toNumber("abc")).toBeNull();
  });
});

describe("parseHealthPayload", () => {
  it("zapis częściowy: tylko przesłane pola", () => {
    const r = parseHealthPayload({ date: "2026-10-30", steps: "8 423" });
    expect(r).toEqual({ ok: true, daily: { date: "2026-10-30", steps: 8423 }, workouts: [] });
  });

  it("tętno i sen", () => {
    const r = parseHealthPayload({
      date: "2026-10-30",
      sleepMinutes: 431,
      heartRate: { avg: "72", resting: 55, max: 148 },
    });
    expect(r.ok && r.daily).toEqual({
      date: "2026-10-30",
      sleep_minutes: 431,
      heart_rate_avg: 72,
      heart_rate_resting: 55,
      heart_rate_max: 148,
    });
  });

  it("trening z normalizacją czasu do UTC i liczb z przecinkiem", () => {
    const r = parseHealthPayload({
      date: "2026-10-30",
      workouts: [
        {
          type: "Bieg",
          start: "2026-10-30T07:10:00+01:00",
          end: "2026-10-30T07:45:00+01:00",
          distanceKm: "6,25",
          avgHeartRate: 151,
        },
      ],
    });
    expect(r.ok && r.workouts[0]).toMatchObject({
      activity: "Bieg",
      started_at: "2026-10-30T06:10:00.000Z",
      distance_km: 6.25,
      heart_rate_avg: 151,
    });
  });

  it.each([
    [{ date: "30.10.2026", steps: 1 }, "RRRR-MM-DD"],
    [{ date: "2026-02-30", steps: 1 }, "RRRR-MM-DD"],
    [{ date: "2026-10-30", steps: -1 }, "steps"],
    [{ date: "2026-10-30", heartRate: { avg: 400 } }, "heart_rate_avg"],
    [{ date: "2026-10-30", sleepMinutes: 2000 }, "sleep_minutes"],
    [{ date: "2026-10-30", workouts: [{ type: "Bieg", start: "wczoraj" }] }, "ISO 8601"],
    [
      { date: "2026-10-30", workouts: [{ type: "Bieg", start: "2026-10-30T08:00:00Z", end: "2026-10-30T07:00:00Z" }] },
      "end",
    ],
    [{ date: "2026-10-30" }, "Brak danych"],
  ])("odrzuca %j", (body, fragment) => {
    expect(parseHealthPayload(body)).toEqual({ ok: false, error: expect.stringContaining(fragment) });
  });
});
