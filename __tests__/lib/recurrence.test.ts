// __tests__/lib/recurrence.test.ts

import { describe, it, expect } from "vitest";
import {
  describeRule,
  nextOccurrenceAfter,
  normalizeRule,
  occurrencesBetween,
  withMonthDay,
  type RecurrenceRule,
} from "@/supabase/functions/_shared/recurrence";

const between = (start: string, rule: RecurrenceRule, from: string, to: string) => occurrencesBetween(start, rule, from, to);

describe("reguły powtarzania", () => {
  it("co 3 dni", () => {
    expect(between("2026-10-01", { freq: "daily", interval: 3 }, "2026-10-01", "2026-10-10")).toEqual([
      "2026-10-01", "2026-10-04", "2026-10-07", "2026-10-10",
    ]);
  });

  it("co 2 tygodnie w pn i czw", () => {
    // 2026-10-05 to poniedziałek
    expect(between("2026-10-05", { freq: "weekly", interval: 2, byWeekday: [0, 3] }, "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-05", "2026-10-08", "2026-10-19", "2026-10-22",
    ]);
  });

  it("dni robocze", () => {
    expect(between("2026-10-09", { freq: "weekly", interval: 1, byWeekday: [0, 1, 2, 3, 4] }, "2026-10-09", "2026-10-13")).toEqual([
      "2026-10-09", "2026-10-12", "2026-10-13",
    ]);
  });

  it("ostatni piątek miesiąca", () => {
    const rule: RecurrenceRule = { freq: "monthly", interval: 1, monthlyBy: "nth_weekday", nth: -1 };
    expect(between("2026-10-30", rule, "2026-10-01", "2027-01-31")).toEqual([
      "2026-10-30", "2026-11-27", "2026-12-25", "2027-01-29",
    ]);
  });

  it("2. wtorek miesiąca wynika z daty startu", () => {
    const rule: RecurrenceRule = { freq: "monthly", interval: 1, monthlyBy: "nth_weekday" };
    expect(between("2026-10-13", rule, "2026-10-01", "2026-12-31")).toEqual(["2026-10-13", "2026-11-10", "2026-12-08"]);
  });

  it("31. dnia: w krótszych miesiącach ostatni dzień miesiąca", () => {
    expect(between("2026-01-31", { freq: "monthly", interval: 1 }, "2026-01-01", "2026-05-31")).toEqual([
      "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31",
    ]);
    expect(between("2027-12-30", { freq: "monthly", interval: 2 }, "2027-12-01", "2028-04-30")).toEqual([
      "2027-12-30", "2028-02-29", "2028-04-30",
    ]);
  });

  it("zadanie przesuwane z 31.: po lutym wraca na 31., nie zostaje na 28.", () => {
    const rule = withMonthDay({ freq: "monthly", interval: 1 }, "2026-01-31")!;
    expect(rule.monthDay).toBe(31);
    const feb = nextOccurrenceAfter("2026-01-31", rule, "2026-01-31");
    expect(feb).toBe("2026-02-28");
    // kolejny obrót liczony od nowego terminu
    expect(nextOccurrenceAfter(feb!, rule, feb!)).toBe("2026-03-31");
    expect(nextOccurrenceAfter("2026-03-31", rule, "2026-03-31")).toBe("2026-04-30");
  });

  it("29 lutego co rok: w latach nieprzestępnych 28 lutego", () => {
    expect(between("2028-02-29", { freq: "yearly", interval: 1 }, "2028-01-01", "2030-12-31")).toEqual([
      "2028-02-29", "2029-02-28", "2030-02-28",
    ]);
  });

  it("opis reguły 31. dnia mówi o krótszych miesiącach", () => {
    expect(describeRule({ freq: "monthly", interval: 1, monthlyBy: "monthday" }, "2026-01-31")).toBe(
      "Co miesiąc, 31. dnia (w krótszych miesiącach – ostatniego dnia)"
    );
    expect(describeRule({ freq: "monthly", interval: 1, monthlyBy: "monthday" }, "2026-01-15")).toBe("Co miesiąc, 15. dnia");
  });

  it("do dnia i liczba powtórzeń", () => {
    expect(between("2026-10-01", { freq: "daily", interval: 1, until: "2026-10-03" }, "2026-10-01", "2026-12-31")).toHaveLength(3);
    expect(between("2026-10-01", { freq: "weekly", interval: 1, count: 4 }, "2026-10-01", "2027-12-31")).toHaveLength(4);
  });

  it("następne wystąpienie po zrobieniu zadania z opóźnieniem", () => {
    const rule: RecurrenceRule = { freq: "weekly", interval: 2, byWeekday: [0] };
    expect(nextOccurrenceAfter("2026-10-05", rule, "2026-10-08")).toBe("2026-10-19");
    expect(nextOccurrenceAfter("2026-10-01", { freq: "daily", interval: 1, until: "2026-10-02" }, "2026-10-02")).toBeNull();
  });

  it("odrzuca śmieci i przycina wartości", () => {
    expect(normalizeRule({ freq: "hourly" })).toBeNull();
    expect(normalizeRule({ freq: "weekly", interval: 500, byWeekday: [9, 2, 2] })).toEqual({ freq: "weekly", interval: 99, byWeekday: [2] });
  });

  it("opisuje regułę po polsku", () => {
    expect(describeRule({ freq: "weekly", interval: 2, byWeekday: [0, 2] })).toBe("Co 2 tygodnie: pn, śr");
    expect(describeRule({ freq: "monthly", interval: 1, monthlyBy: "nth_weekday", nth: -1 }, "2026-10-30")).toBe("Co miesiąc, w ostatni piątek");
    expect(describeRule({ freq: "daily", interval: 1, until: "2026-12-20" })).toBe("Codziennie, do 20.12.2026");
  });
});
