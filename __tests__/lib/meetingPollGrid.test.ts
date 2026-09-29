import { describe, expect, it } from "vitest";
import {
  bestRanges,
  contiguousRanges,
  formatDurationMinutes,
  formatPollDay,
  nextWorkingDays,
  pluralPl,
  slotEndTime,
  slotKey,
} from "@/lib/meetingPollGrid";

const times = ["10:00", "10:30", "11:00", "11:30", "12:00"];

describe("slotEndTime", () => {
  it("nie zawija północy", () => {
    expect(slotEndTime("10:30", 30)).toBe("11:00");
    expect(slotEndTime("23:30", 30)).toBe("24:00");
  });
});

describe("formatDurationMinutes", () => {
  it("formatuje minuty i godziny", () => {
    expect(formatDurationMinutes(45)).toBe("45 min");
    expect(formatDurationMinutes(120)).toBe("2 h");
    expect(formatDurationMinutes(150)).toBe("2 h 30 min");
  });
});

describe("formatPollDay", () => {
  it("podaje dzień tygodnia i datę", () => {
    expect(formatPollDay("2026-09-29")).toEqual({ weekday: "wt.", day: "29.09" });
    expect(formatPollDay("2026-10-05")).toEqual({ weekday: "pon.", day: "05.10" });
  });
});

describe("nextWorkingDays", () => {
  it("pomija weekendy i sam dzień początkowy", () => {
    expect(nextWorkingDays("2026-10-01", 3)).toEqual(["2026-10-02", "2026-10-05", "2026-10-06"]);
  });

  it("z soboty zaczyna od poniedziałku", () => {
    expect(nextWorkingDays("2026-10-03", 2)).toEqual(["2026-10-05", "2026-10-06"]);
  });
});

describe("contiguousRanges", () => {
  it("skleja kolejne wolne sloty i rozdziela przerwy", () => {
    const free = new Set([slotKey("2026-10-05", "10:00"), slotKey("2026-10-05", "10:30"), slotKey("2026-10-05", "11:30")]);
    const ranges = contiguousRanges(["2026-10-05", "2026-10-06"], times, 30, (d, t) => free.has(slotKey(d, t)));
    expect(ranges.map((r) => [r.date, r.start, r.end, r.slots])).toEqual([
      ["2026-10-05", "10:00", "11:00", 2],
      ["2026-10-05", "11:30", "12:00", 1],
    ]);
  });

  it("obsługuje przedział sięgający końca dnia", () => {
    const ranges = contiguousRanges(["2026-10-05"], times, 30, (_d, t) => t >= "11:30");
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ start: "11:30", end: "12:30", startIndex: 3, endIndex: 4 });
  });
});

describe("bestRanges", () => {
  const counts: Record<string, number> = {
    [slotKey("2026-10-05", "10:00")]: 3,
    [slotKey("2026-10-05", "10:30")]: 3,
    [slotKey("2026-10-05", "11:00")]: 2,
    [slotKey("2026-10-06", "12:00")]: 3,
  };

  it("zwraca najdłuższe przedziały z największą liczbą osób", () => {
    const best = bestRanges(["2026-10-05", "2026-10-06"], times, 30, counts);
    expect(best.count).toBe(3);
    expect(best.ranges.map((r) => [r.date, r.start, r.end])).toEqual([
      ["2026-10-05", "10:00", "11:00"],
      ["2026-10-06", "12:00", "12:30"],
    ]);
  });

  it("bez odpowiedzi nie proponuje niczego", () => {
    expect(bestRanges(["2026-10-05"], times, 30, {})).toEqual({ count: 0, ranges: [] });
  });

  it("respektuje limit", () => {
    expect(bestRanges(["2026-10-05", "2026-10-06"], times, 30, counts, 1).ranges).toHaveLength(1);
  });
});

describe("pluralPl", () => {
  const forms = (n: number) => pluralPl(n, "slot", "sloty", "slotów");

  it("odmienia po liczebniku", () => {
    expect([1, 2, 4, 5, 12, 14, 22, 25, 112].map(forms)).toEqual([
      "slot", "sloty", "sloty", "slotów", "slotów", "slotów", "sloty", "slotów", "slotów",
    ]);
  });
});
