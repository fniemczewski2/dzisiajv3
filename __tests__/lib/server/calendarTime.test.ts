// __tests__/lib/server/calendarTime.test.ts
//
// Strefa Europe/Warsaw: czas zimowy UTC+1, letni UTC+2 (zmiany 29.03.2026 i 25.10.2026 o 01:00 UTC).

import { describe, it, expect } from "vitest";
import { outlookToSupabaseTime, toSupabaseTime, warsawNaiveToRFC3339 } from "@/lib/server/calendarTime";

describe("toSupabaseTime (Google)", () => {
  it("moment z przesunięciem → czas polski, z uwzględnieniem zmiany czasu", () => {
    expect(toSupabaseTime({ dateTime: "2026-03-29T00:30:00Z" })).toBe("2026-03-29T01:30:00");
    expect(toSupabaseTime({ dateTime: "2026-03-29T01:30:00Z" })).toBe("2026-03-29T03:30:00");
    expect(toSupabaseTime({ dateTime: "2026-10-25T00:30:00Z" })).toBe("2026-10-25T02:30:00");
    expect(toSupabaseTime({ dateTime: "2026-10-25T01:30:00Z" })).toBe("2026-10-25T02:30:00");
    expect(toSupabaseTime({ dateTime: "2026-07-01T10:00:00-04:00" })).toBe("2026-07-01T16:00:00");
  });

  it("wydarzenie całodniowe: koniec wyłączny (RFC 5545) → ostatnia sekunda poprzedniego dnia", () => {
    expect(toSupabaseTime({ date: "2026-11-02" })).toBe("2026-11-02T00:00:00");
    expect(toSupabaseTime({ date: "2026-11-03" }, true)).toBe("2026-11-02T23:59:59");
    expect(toSupabaseTime({ date: "2026-03-01" }, true)).toBe("2026-02-28T23:59:59");
  });
});

describe("outlookToSupabaseTime", () => {
  it("czas bez strefy z Graph jest w UTC", () => {
    expect(outlookToSupabaseTime("2026-11-02T09:00:00.0000000")).toBe("2026-11-02T10:00:00");
    expect(outlookToSupabaseTime("2026-07-02T09:00:00")).toBe("2026-07-02T11:00:00");
    expect(outlookToSupabaseTime("2026-07-02T09:00:00+02:00")).toBe("2026-07-02T09:00:00");
  });
});

describe("warsawNaiveToRFC3339", () => {
  it("dodaje przesunięcie właściwe dla daty (zima +01:00, lato +02:00)", () => {
    expect(warsawNaiveToRFC3339("2026-11-02T10:00:00")).toBe("2026-11-02T10:00:00+01:00");
    expect(warsawNaiveToRFC3339("2026-07-02 10:00:00")).toBe("2026-07-02T10:00:00+02:00");
  });
});
