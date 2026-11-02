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
    expect(r).toEqual({
      ok: true,
      daily: { date: "2026-10-30", steps: 8423 },
      workouts: [],
      heartRateSamples: [],
      sleepSegments: [],
    });
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

describe("toNumber – wartości z jednostkami z Apple Zdrowie", () => {
  it.each([
    ["8 423 kroki", 8423],
    ["8\u00a0423 kroków", 8423],
    ["72 uderz./min", 72],
    ["431,5 min", 431.5],
    ["98%", 98],
  ])("%j → %d", (raw, expected) => {
    expect(toNumber(raw)).toBe(expected);
  });

  it("tekst bez liczby na początku lub z kolejnymi cyframi po jednostce jest odrzucany", () => {
    expect(toNumber("kroki 8423")).toBeNull();
    expect(toNumber("72 / 80")).toBeNull();
  });
});

describe("rejestr tętna (heartRateSamples)", () => {
  const sample = (time: string, bpm: unknown) => ({ time, bpm });

  it("pomiary z czasem ISO i tętnem (także jako tekst); czas zapisany w UTC", () => {
    const r = parseHealthPayload({
      date: "2026-11-02",
      heartRateSamples: [sample("2026-11-02T07:10:00+01:00", "72"), sample("2026-11-02T07:15:00+01:00", 75)],
    });
    expect(r).toMatchObject({
      ok: true,
      daily: { date: "2026-11-02" },
      heartRateSamples: [
        { recorded_at: "2026-11-02T06:10:00.000Z", bpm: 72 },
        { recorded_at: "2026-11-02T06:15:00.000Z", bpm: 75 },
      ],
    });
  });

  it("sam rejestr tętna wystarcza (bez pozostałych pól)", () => {
    expect(parseHealthPayload({ date: "2026-11-02", heartRateSamples: [sample("2026-11-02T07:10:00Z", 70)] }).ok).toBe(
      true
    );
  });

  it("dwa pomiary o tym samym czasie: zostaje ostatni (zapis zbiorczy nie może zawierać duplikatów klucza)", () => {
    const r = parseHealthPayload({
      date: "2026-11-02",
      heartRateSamples: [sample("2026-11-02T07:10:00Z", 70), sample("2026-11-02T07:10:00Z", 74)],
    });
    expect(r.ok && r.heartRateSamples).toEqual([{ recorded_at: "2026-11-02T07:10:00.000Z", bpm: 74 }]);
  });

  it.each([
    [[sample("2026-11-02T07:10:00Z", 300)], "nr 1"],
    [[sample("2026-11-02T07:10:00Z", 70), sample("wczoraj", 70)], "nr 2"],
    [[sample("2026-11-02T07:10:00Z", "dużo")], "nr 1"],
    [["70"], "nr 1"],
    ["nie lista", "musi być listą"],
  ])("odrzuca %j", (samples, fragment) => {
    expect(parseHealthPayload({ date: "2026-11-02", heartRateSamples: samples })).toEqual({
      ok: false,
      error: expect.stringContaining(fragment),
    });
  });

  it("limit pomiarów w jednym wysłaniu", () => {
    const many = Array.from({ length: 5001 }, (_, i) =>
      sample(new Date(Date.UTC(2026, 10, 2) + i * 1000).toISOString(), 70)
    );
    expect(parseHealthPayload({ date: "2026-11-02", heartRateSamples: many })).toEqual({
      ok: false,
      error: expect.stringContaining("Najwyżej 5000"),
    });
  });
});

describe("fazy snu (sleepSegments)", () => {
  const seg = (stage: unknown, start: string, end: string) => ({ stage, start, end });

  it("polskie i angielskie nazwy faz są normalizowane", () => {
    const r = parseHealthPayload({
      date: "2026-11-02",
      sleepSegments: [
        seg("Głęboki", "2026-11-01T23:00:00+01:00", "2026-11-02T00:30:00+01:00"),
        seg("REM", "2026-11-02T00:30:00+01:00", "2026-11-02T01:00:00+01:00"),
        seg("Podstawowy", "2026-11-02T01:00:00+01:00", "2026-11-02T02:00:00+01:00"),
        seg("Awake", "2026-11-02T02:00:00+01:00", "2026-11-02T02:10:00+01:00"),
      ],
    });
    expect(r.ok && r.sleepSegments.map((s) => s.stage)).toEqual(["deep", "rem", "core", "awake"]);
    expect(r.ok && r.sleepSegments[0]).toEqual({
      stage: "deep",
      started_at: "2026-11-01T22:00:00.000Z",
      ended_at: "2026-11-01T23:30:00.000Z",
    });
  });

  it("sam sen wystarcza (bez pozostałych pól)", () => {
    expect(
      parseHealthPayload({
        date: "2026-11-02",
        sleepSegments: [seg("core", "2026-11-02T01:00:00Z", "2026-11-02T02:00:00Z")],
      }).ok
    ).toBe(true);
  });

  it("pusta lista snu nie liczy się jako dane", () => {
    expect(parseHealthPayload({ date: "2026-11-02", sleepSegments: [] })).toEqual({
      ok: false,
      error: "Brak danych do zapisania.",
    });
  });

  it("nieznana faza: komunikat z nazwą i numerem odcinka", () => {
    expect(
      parseHealthPayload({
        date: "2026-11-02",
        sleepSegments: [seg("Drzemka", "2026-11-02T01:00:00Z", "2026-11-02T02:00:00Z")],
      })
    ).toEqual({ ok: false, error: "Nieznana faza snu „Drzemka” w odcinku nr 1." });
  });

  it.each([
    ["koniec przed początkiem", seg("core", "2026-11-02T02:00:00Z", "2026-11-02T01:00:00Z")],
    ["koniec równy początkowi", seg("core", "2026-11-02T02:00:00Z", "2026-11-02T02:00:00Z")],
    ["ponad 24 godziny", seg("core", "2026-11-01T00:00:00Z", "2026-11-02T01:00:00Z")],
    ["niepoprawny czas", seg("core", "wczoraj", "2026-11-02T01:00:00Z")],
  ])("odrzuca odcinek: %s", (_name, segment) => {
    expect(parseHealthPayload({ date: "2026-11-02", sleepSegments: [segment] })).toEqual({
      ok: false,
      error: expect.stringContaining("Niepoprawny czas odcinka snu nr 1"),
    });
  });

  it("limit odcinków w jednym wysłaniu", () => {
    const many = Array.from({ length: 201 }, (_, i) =>
      seg("core", `2026-11-02T01:${String(i % 60).padStart(2, "0")}:00Z`, "2026-11-02T05:00:00Z")
    );
    expect(parseHealthPayload({ date: "2026-11-02", sleepSegments: many })).toEqual({
      ok: false,
      error: expect.stringContaining("Najwyżej 200"),
    });
  });

  it("powtórzony odcinek (ta sama faza i początek) jest scalany", () => {
    const one = seg("core", "2026-11-02T01:00:00Z", "2026-11-02T02:00:00Z");
    const r = parseHealthPayload({ date: "2026-11-02", sleepSegments: [one, one] });
    expect(r.ok && r.sleepSegments).toHaveLength(1);
  });
});

describe("treningi – duplikaty w jednym wysłaniu", () => {
  it("ten sam rodzaj i początek: zostaje ostatni", () => {
    const w = (energy: number) => ({ type: "Bieg", start: "2026-11-02T06:00:00Z", energyKcal: energy });
    const r = parseHealthPayload({ date: "2026-11-02", workouts: [w(100), w(200)] });
    expect(r.ok && r.workouts).toHaveLength(1);
    expect(r.ok && r.workouts[0].energy_kcal).toBe(200);
  });
});
