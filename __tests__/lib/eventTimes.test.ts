// __tests__/lib/eventTimes.test.ts

import { describe, it, expect } from "vitest";
import { addMinutesToLocal, durationBetween, defaultTimedStart } from "@/lib/eventTimes";

describe("addMinutesToLocal", () => {
  it("dodaje godzinę", () => {
    expect(addMinutesToLocal("2026-10-06T14:00", 60)).toBe("2026-10-06T15:00");
  });
  it("przechodzi przez północ na następny dzień", () => {
    expect(addMinutesToLocal("2026-10-06T23:30", 60)).toBe("2026-10-07T00:30");
  });
  it("nie psuje niepełnej wartości (użytkownik jeszcze wpisuje)", () => {
    expect(addMinutesToLocal("2026-10-06T", 60)).toBe("2026-10-06T");
  });
});

describe("durationBetween", () => {
  it("liczy minuty", () => {
    expect(durationBetween("2026-10-06T14:00", "2026-10-06T16:00")).toBe(120);
  });
  it("zwraca null dla niepoprawnej wartości", () => {
    expect(durationBetween("", "2026-10-06T16:00")).toBeNull();
  });
});

describe("defaultTimedStart", () => {
  it("dziś: najbliższa pełna godzina", () => {
    const now = new Date(2026, 9, 6, 14, 37);
    expect(defaultTimedStart(new Date(2026, 9, 6), now)).toBe("2026-10-06T15:00");
  });
  it("dziś późnym wieczorem: nie wychodzi poza ten dzień", () => {
    const now = new Date(2026, 9, 6, 23, 40);
    expect(defaultTimedStart(new Date(2026, 9, 6), now)).toBe("2026-10-06T23:00");
  });
  it("inny dzień: 9:00", () => {
    const now = new Date(2026, 9, 6, 14, 37);
    expect(defaultTimedStart(new Date(2026, 9, 9), now)).toBe("2026-10-09T09:00");
  });
});
