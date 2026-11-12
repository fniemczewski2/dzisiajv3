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

describe("listy w formacie ze Skrótów (tekst zamiast tablicy)", () => {
  // Tak Skróty zamieniają listę słowników na tekst: obiekty JSON oddzielone nową linią.
  const asText = `{
  "bpm" : 63,
  "time" : "2026-11-02T06:10:00+01:00"
}
{
  "bpm" : 55,
  "time" : "2026-11-02T06:15:00+01:00"
}`;

  it("rejestr tętna jako tekst z obiektami oddzielonymi nową linią", () => {
    const r = parseHealthPayload({ date: "2026-11-02", heartRateSamples: asText });
    expect(r.ok && r.heartRateSamples).toEqual([
      { recorded_at: "2026-11-02T05:10:00.000Z", bpm: 63 },
      { recorded_at: "2026-11-02T05:15:00.000Z", bpm: 55 },
    ]);
  });

  it("tekst z tablicą JSON, pojedynczy obiekt i pusty tekst", () => {
    const one = { time: "2026-11-02T06:10:00+01:00", bpm: 63 };
    expect(parseHealthPayload({ date: "2026-11-02", heartRateSamples: JSON.stringify([one, one]) }).ok).toBe(true);
    expect(parseHealthPayload({ date: "2026-11-02", heartRateSamples: one })).toMatchObject({
      ok: true,
      heartRateSamples: [{ bpm: 63 }],
    });
    expect(parseHealthPayload({ date: "2026-11-02", steps: 1, heartRateSamples: "" })).toMatchObject({
      ok: true,
      heartRateSamples: [],
    });
  });

  it("fazy snu i treningi jako tekst z obiektami", () => {
    const sleepText = `{ "stage" : "Głęboki", "start" : "2026-11-02T01:00:00+01:00", "end" : "2026-11-02T02:00:00+01:00" }
{ "stage" : "REM", "start" : "2026-11-02T02:00:00+01:00", "end" : "2026-11-02T02:30:00+01:00" }`;
    const r = parseHealthPayload({ date: "2026-11-02", sleepSegments: sleepText });
    expect(r.ok && r.sleepSegments.map((s) => s.stage)).toEqual(["deep", "rem"]);
    const w = parseHealthPayload({
      date: "2026-11-02",
      workouts: '{ "type" : "Bieg", "start" : "2026-11-02T06:00:00Z" }',
    });
    expect(w.ok && w.workouts).toHaveLength(1);
  });

  it("tekst, który nie jest listą obiektów, nadal daje czytelny błąd", () => {
    expect(parseHealthPayload({ date: "2026-11-02", heartRateSamples: "nie lista" })).toEqual({
      ok: false,
      error:
        "Pole „heartRateSamples” musi być listą (otrzymano tekst: 9 znaków, zaczyna się od „n”, nie jest poprawnym JSON-em).",
    });
  });
});

describe("czas spoza lat 2000–2100 (błąd formatu daty w skrócie)", () => {
  it("pomiar z datą z roku 1 (liczba sekund sformatowana jako data) jest odrzucany", () => {
    expect(
      parseHealthPayload({ date: "2026-11-02", heartRateSamples: [{ time: "0001-01-01T00:00:10+01:24", bpm: 63 }] })
    ).toEqual({ ok: false, error: expect.stringContaining("rok 2000-2100") });
  });

  it("odcinek snu i trening z taką datą też", () => {
    expect(
      parseHealthPayload({
        date: "2026-11-02",
        sleepSegments: [{ stage: "core", start: "0001-01-01T00:00:10+01:24", end: "0001-01-01T01:00:10+01:24" }],
      })
    ).toEqual({ ok: false, error: expect.stringContaining("rok 2000-2100") });
    expect(
      parseHealthPayload({ date: "2026-11-02", workouts: [{ type: "Bieg", start: "0001-01-01T00:00:10Z" }] }).ok
    ).toBe(false);
  });

  it("granice zakresu: 2000-01-01 przechodzi, 1999-12-31 i 2100-01-01 nie", () => {
    const at = (time: string) => parseHealthPayload({ date: "2026-11-02", heartRateSamples: [{ time, bpm: 60 }] }).ok;
    expect(at("2000-01-01T00:00:00Z")).toBe(true);
    expect(at("1999-12-31T23:59:59Z")).toBe(false);
    expect(at("2100-01-01T00:00:00Z")).toBe(false);
  });
});

describe("komunikat „musi być listą” pomaga znaleźć błąd w skrócie", () => {
  it("podaje typ, długość i pierwszy znak, ale nie treść", () => {
    const secret = "Głęboki-tajne-dane";
    const r = parseHealthPayload({ date: "2026-11-02", sleepSegments: `{ "stage" : "${secret}" ` });
    expect(r).toEqual({
      ok: false,
      error: expect.stringContaining("Pole „sleepSegments” musi być listą (otrzymano tekst:"),
    });
    expect(r.ok === false && r.error).toContain("zaczyna się od „{”");
    expect(r.ok === false && r.error).not.toContain(secret);
  });

  it("wpisana nazwa zamiast zmiennej (typowy błąd w skrócie) jest rozpoznawalna po długości i pierwszym znaku", () => {
    expect(parseHealthPayload({ date: "2026-11-02", sleepSegments: "Odcinki" })).toEqual({
      ok: false,
      error:
        "Pole „sleepSegments” musi być listą (otrzymano tekst: 7 znaków, zaczyna się od „O”, nie jest poprawnym JSON-em).",
    });
  });

  it("liczba i wartość logiczna", () => {
    expect(parseHealthPayload({ date: "2026-11-02", sleepSegments: 5 })).toEqual({
      ok: false,
      error: "Pole „sleepSegments” musi być listą (otrzymano liczbę).",
    });
    expect(parseHealthPayload({ date: "2026-11-02", workouts: true })).toEqual({
      ok: false,
      error: "Pole „workouts” musi być listą (otrzymano wartość logiczną).",
    });
  });
});

describe("czas trwania treningu", () => {
  const parse = (workout: Record<string, unknown>) => {
    const r = parseHealthPayload({
      date: "2026-11-02",
      workouts: [{ type: "Bieg", start: "2026-11-02T06:00:00Z", ...workout }],
    });
    return r.ok ? r.workouts[0].duration_minutes : "błąd";
  };

  it("bez durationMinutes liczony z początku i końca (minuty)", () => {
    expect(parse({ end: "2026-11-02T06:35:00Z" })).toBe(35);
    expect(parse({ end: "2026-11-02T06:00:40Z" })).toBe(1);
  });

  it("przesłany durationMinutes ma pierwszeństwo", () => {
    expect(parse({ end: "2026-11-02T06:35:00Z", durationMinutes: 40 })).toBe(40);
  });

  it("bez końca albo z czasem dłuższym niż doba: brak wartości", () => {
    expect(parse({})).toBeNull();
    expect(parse({ end: "2026-11-03T08:00:00Z" })).toBeNull();
  });
});
