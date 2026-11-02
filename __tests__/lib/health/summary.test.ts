// __tests__/lib/health/summary.test.ts
//
// Podsumowania liczone w aplikacji: tętno (ostatni pomiar, średnia, minimum, maksimum) i sen (fazy bez podwójnego liczenia).

import { describe, it, expect } from "vitest";
import { resolveSleepTimeline, summarizeHeartRate, summarizeSleep, type SleepSegment } from "@/lib/health/summary";

// Noc 2→3 listopada 2026 (UTC+1): godziny od 12:00 należą do dnia 2., wcześniejsze do 3.
const day = (time: string) => (time >= "12:00" ? "2026-11-02" : "2026-11-03");
const at = (time: string) => `${day(time)}T${time}:00+01:00`;
const seg = (stage: SleepSegment["stage"], from: string, to: string): SleepSegment => ({
  stage,
  started_at: at(from),
  ended_at: at(to),
});

describe("summarizeHeartRate", () => {
  it("brak pomiarów: null", () => {
    expect(summarizeHeartRate([])).toBeNull();
  });

  it("ostatni pomiar wyznacza znacznik czasu, nie kolejność na liście; średnia, minimum, maksimum", () => {
    const summary = summarizeHeartRate([
      { recorded_at: at("06:00"), bpm: 60 },
      { recorded_at: at("08:00"), bpm: 90 },
      { recorded_at: at("07:00"), bpm: 75 },
    ]);
    expect(summary).toEqual({
      count: 3,
      latest: { recorded_at: at("08:00"), bpm: 90 },
      avg: 75,
      min: 60,
      max: 90,
    });
  });

  it("średnia z dokładnością do 0,1", () => {
    const s = summarizeHeartRate([60, 61, 61].map((bpm, i) => ({ recorded_at: at(`0${i}:00`), bpm })));
    expect(s?.avg).toBe(60.7);
    expect(summarizeHeartRate([{ recorded_at: at("01:00"), bpm: 55 }])).toMatchObject({ avg: 55, min: 55, max: 55 });
  });
});

describe("resolveSleepTimeline", () => {
  it("łączy sąsiednie odcinki tej samej fazy", () => {
    const timeline = resolveSleepTimeline([seg("core", "23:00", "00:00"), seg("core", "00:00", "01:00")]);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({ stage: "core" });
    expect(Date.parse(timeline[0].ended_at) - Date.parse(timeline[0].started_at)).toBe(2 * 3_600_000);
  });

  it("pomija odcinki z końcem nie późniejszym niż początek lub z niepoprawną datą", () => {
    expect(
      resolveSleepTimeline([
        { stage: "core", started_at: at("02:00"), ended_at: at("01:00") },
        { stage: "deep", started_at: "nie data", ended_at: at("03:00") },
      ])
    ).toEqual([]);
  });
});

describe("summarizeSleep", () => {
  it("brak odcinków: null", () => {
    expect(summarizeSleep([])).toBeNull();
  });

  it("noc bez nakładania: czas w fazach, sen, przebudzenia, w łóżku i okno snu", () => {
    const summary = summarizeSleep([
      seg("deep", "23:00", "00:30"),
      seg("core", "00:30", "02:00"),
      seg("rem", "02:00", "02:30"),
      seg("awake", "02:30", "02:40"),
      seg("core", "02:40", "06:00"),
    ]);
    expect(summary).toMatchObject({
      asleepMinutes: 410,
      awakeMinutes: 10,
      inBedMinutes: 420,
      startedAt: new Date(at("23:00")).toISOString(),
      endedAt: new Date(at("06:00")).toISOString(),
    });
    expect(summary?.stageMinutes).toEqual({ deep: 90, rem: 30, core: 290, asleep: 0, awake: 10, in_bed: 0 });
  });

  it("nakładające się źródła (czas w łóżku, sen i faza głęboka) nie są liczone podwójnie", () => {
    const summary = summarizeSleep([
      seg("in_bed", "23:00", "07:00"),
      seg("core", "23:30", "06:30"),
      seg("deep", "01:00", "02:00"),
    ]);
    expect(summary?.stageMinutes).toEqual({ deep: 60, rem: 0, core: 360, asleep: 0, awake: 0, in_bed: 60 });
    expect(summary?.asleepMinutes).toBe(420);
    expect(summary?.inBedMinutes).toBe(480);
  });

  it("ten sam sen zapisany przez dwa urządzenia liczy się raz", () => {
    const summary = summarizeSleep([seg("core", "23:00", "07:00"), seg("core", "23:00", "07:00")]);
    expect(summary?.asleepMinutes).toBe(480);
  });

  it("jawne przebudzenie wygrywa z ogólnym snem bez podziału na fazy", () => {
    const summary = summarizeSleep([seg("asleep", "23:00", "07:00"), seg("awake", "02:00", "02:10")]);
    expect(summary?.awakeMinutes).toBe(10);
    expect(summary?.stageMinutes.asleep).toBe(470);
    expect(summary?.asleepMinutes).toBe(470);
  });
});
