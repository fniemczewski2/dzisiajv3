// __tests__/lib/health/sleepSessions.test.ts
//
// Sny z odcinków: dwa sny wysłane razem nie zlewają się, a dzień snu to dzień przebudzenia (Europe/Warsaw).

import { describe, it, expect } from "vitest";
import { groupSleepSessions, sleepSessionsEndingOn } from "@/lib/health/sleepSessions";
import type { SleepSegment } from "@/lib/health/summary";

const seg = (from: string, to: string, stage: SleepSegment["stage"] = "core"): SleepSegment => ({
  stage,
  started_at: from,
  ended_at: to,
});

describe("groupSleepSessions", () => {
  it("brak odcinków: brak snów", () => {
    expect(groupSleepSessions([])).toEqual([]);
  });

  it("krótkie przebudzenia (do 3 h) zostają w jednym śnie, dłuższa przerwa dzieli", () => {
    const joined = groupSleepSessions([
      seg("2026-11-02T00:00:00Z", "2026-11-02T01:00:00Z"),
      seg("2026-11-02T04:00:00Z", "2026-11-02T05:00:00Z"),
    ]);
    expect(joined).toHaveLength(1);
    const split = groupSleepSessions([
      seg("2026-11-02T00:00:00Z", "2026-11-02T01:00:00Z"),
      seg("2026-11-02T04:00:01Z", "2026-11-02T05:00:00Z"),
    ]);
    expect(split).toHaveLength(2);
  });

  it("niepoukładane i nakładające się odcinki; odcinek zawarty w innym nie wydłuża snu", () => {
    const sessions = groupSleepSessions([
      seg("2026-11-02T03:00:00Z", "2026-11-02T04:00:00Z"),
      seg("2026-11-02T00:00:00Z", "2026-11-02T06:00:00Z", "in_bed"),
      seg("2026-11-02T01:00:00Z", "2026-11-02T02:00:00Z", "deep"),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].map((s) => s.stage)).toEqual(["in_bed", "deep", "core"]);
  });

  it("pomija odcinki z niepoprawnym czasem", () => {
    expect(
      groupSleepSessions([seg("nie data", "2026-11-02T01:00:00Z"), seg("2026-11-02T02:00:00Z", "2026-11-02T01:00:00Z")])
    ).toEqual([]);
  });
});

describe("sleepSessionsEndingOn", () => {
  // Dane jak w rzeczywistej bazie: sen z zegarka (2.11, UTC+1) i sen z telefonu (3.11) – wysłane jednym skryptem.
  const sleep1 = [
    seg("2026-11-01T23:32:00Z", "2026-11-01T23:51:36Z"),
    seg("2026-11-01T23:51:36Z", "2026-11-01T23:59:08Z", "deep"),
    seg("2026-11-01T23:59:08Z", "2026-11-02T01:25:34Z"),
  ];
  const sleep2 = [
    seg("2026-11-03T00:14:43Z", "2026-11-03T00:27:17Z", "asleep"),
    seg("2026-11-03T00:27:47Z", "2026-11-03T02:25:52Z", "asleep"),
  ];

  it("każdy dzień dostaje tylko swój sen", () => {
    const all = [...sleep1, ...sleep2];
    expect(sleepSessionsEndingOn(all, "2026-11-02")).toEqual([sleep1]);
    expect(sleepSessionsEndingOn(all, "2026-11-03")).toEqual([sleep2]);
    expect(sleepSessionsEndingOn(all, "2026-11-01")).toEqual([]);
    expect(sleepSessionsEndingOn(all, "2026-11-04")).toEqual([]);
  });

  it("sen przez północ należy do dnia przebudzenia (czas Warszawy)", () => {
    const overMidnight = [seg("2026-11-02T22:00:00Z", "2026-11-02T23:30:00Z")]; // 23:00–00:30 w Warszawie
    expect(sleepSessionsEndingOn(overMidnight, "2026-11-03")).toHaveLength(1);
    expect(sleepSessionsEndingOn(overMidnight, "2026-11-02")).toEqual([]);
    const beforeMidnight = [seg("2026-11-02T20:00:00Z", "2026-11-02T22:30:00Z")]; // kończy się 23:30
    expect(sleepSessionsEndingOn(beforeMidnight, "2026-11-02")).toHaveLength(1);
  });

  it("dwa sny kończące się tego samego dnia są osobnymi sesjami", () => {
    const nap = [seg("2026-11-03T06:00:00Z", "2026-11-03T07:00:00Z")];
    expect(sleepSessionsEndingOn([...sleep2, ...nap], "2026-11-03")).toHaveLength(2);
  });
});
