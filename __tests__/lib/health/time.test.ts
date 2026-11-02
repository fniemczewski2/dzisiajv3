// __tests__/lib/health/time.test.ts
//
// Doba i godziny w strefie Warszawy, w tym zmiany czasu (29.03.2026 i 25.10.2026).

import { describe, it, expect } from "vitest";
import { addDaysToDate, dayBounds, warsawDate, warsawInstant, warsawTime } from "@/lib/health/time";

const hours = (b: { from: string; to: string }) => (Date.parse(b.to) - Date.parse(b.from)) / 3_600_000;

describe("warsawDate / warsawTime", () => {
  it("dzień i godzina w czasie zimowym (UTC+1) i letnim (UTC+2)", () => {
    expect(warsawDate("2026-11-02T23:30:00Z")).toBe("2026-11-03");
    expect(warsawDate("2026-07-01T22:30:00Z")).toBe("2026-07-02");
    expect(warsawTime("2026-11-02T06:10:00Z")).toBe("07:10");
    expect(warsawTime("2026-07-01T05:10:00Z")).toBe("07:10");
  });
});

describe("warsawInstant", () => {
  it("godzina ścienna → chwila UTC, zima i lato", () => {
    expect(warsawInstant("2026-11-02", "07:10")).toBe("2026-11-02T06:10:00.000Z");
    expect(warsawInstant("2026-07-01", "07:10")).toBe("2026-07-01T05:10:00.000Z");
    expect(warsawInstant("2026-11-02")).toBe("2026-11-01T23:00:00.000Z");
  });

  it("godziny tuż przed zmianą czasu: druga iteracja koryguje przesunięcie", () => {
    expect(warsawInstant("2026-03-29", "01:30")).toBe("2026-03-29T00:30:00.000Z");
    expect(warsawInstant("2026-10-25", "01:30")).toBe("2026-10-24T23:30:00.000Z");
    expect(warsawInstant("2026-03-29", "03:30")).toBe("2026-03-29T01:30:00.000Z");
  });

  it.each([
    ["2026-02-30", "10:00"],
    ["2026-13-01", "10:00"],
    ["2026-11-02", "24:00"],
    ["2026-11-02", "10:60"],
    ["jutro", "10:00"],
    ["2026-11-02", "10"],
  ])("odrzuca %s %s", (date, time) => {
    expect(warsawInstant(date, time)).toBeNull();
  });
});

describe("dayBounds", () => {
  it("doba od północy do północy następnego dnia (UTC+1)", () => {
    expect(dayBounds("2026-11-02")).toEqual({ from: "2026-11-01T23:00:00.000Z", to: "2026-11-02T23:00:00.000Z" });
  });

  it("doba ze zmianą czasu ma 23 i 25 godzin", () => {
    expect(hours(dayBounds("2026-03-29") as { from: string; to: string })).toBe(23);
    expect(hours(dayBounds("2026-10-25") as { from: string; to: string })).toBe(25);
    expect(hours(dayBounds("2026-06-15") as { from: string; to: string })).toBe(24);
  });

  it("pomiar tuż przed północą należy do swojego dnia, a o północy do następnego", () => {
    const b = dayBounds("2026-11-02") as { from: string; to: string };
    const inDay = (iso: string) => iso >= b.from && iso < b.to;
    expect(inDay("2026-11-02T22:59:59.000Z")).toBe(true);
    expect(inDay("2026-11-02T23:00:00.000Z")).toBe(false);
  });

  it("niepoprawna data: null", () => {
    expect(dayBounds("2026-02-30")).toBeNull();
  });
});

describe("addDaysToDate", () => {
  it("przełom miesiąca, roku i dzień przestępny", () => {
    expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDaysToDate("2026-11-02", 0)).toBe("2026-11-02");
  });
});
