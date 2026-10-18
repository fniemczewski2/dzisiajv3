// __tests__/lib/eventReminders.test.ts
//
// Przypomnienia o wydarzeniach: bez spóźnionych i mylących powiadomień.

import { describe, it, expect } from "vitest";
import {
  eventReminderType,
  warsawWallClockToInstant,
  warsawWallClockNow,
  wallClockDayBounds,
  REMINDER_TOLERANCE_MS,
} from "@/shared/notificationTime";

const none = new Set<string>();
const at = (iso: string) => Date.parse(iso);
const MIN = 60_000;

describe("czas ścienny w Polsce", () => {
  it("zapis z „+00” to czas warszawski (lato +2, zima +1)", () => {
    expect(warsawWallClockToInstant("2026-07-15T14:00:00+00")).toBe(at("2026-07-15T12:00:00Z"));
    expect(warsawWallClockToInstant("2026-12-15 14:00:00+00")).toBe(at("2026-12-15T13:00:00Z"));
    expect(warsawWallClockNow(at("2026-07-15T12:00:00Z"))).toBe("2026-07-15T14:00:00+00:00");
  });
  it("granice dnia w zapisie wydarzeń", () => {
    expect(wallClockDayBounds("2026-10-31")).toEqual({
      start: "2026-10-31T00:00:00+00:00",
      end: "2026-11-01T00:00:00+00:00",
    });
  });
});

describe("eventReminderType", () => {
  const NOW = at("2026-10-08T12:00:00Z"); // 14:00 w Polsce

  it("wydarzenie dodane na dziś: brak „Jutro”, jest tylko „Zaraz” przed startem", () => {
    const start = "2026-10-08T18:00:00+00";
    expect(eventReminderType(start, NOW, none)).toBeNull();
    expect(eventReminderType(start, at("2026-10-08T15:56:00Z"), none)).toBe("5min");
  });

  it("„Jutro” w oknie 24 h przed startem (z tolerancją), potem przepada", () => {
    const start = "2026-10-09T14:00:00+00";
    expect(eventReminderType(start, NOW, none)).toBe("1day");
    expect(eventReminderType(start, NOW + REMINDER_TOLERANCE_MS - MIN, none)).toBe("1day");
    expect(eventReminderType(start, NOW + REMINDER_TOLERANCE_MS + MIN, none)).toBeNull();
  });

  it("wydarzenie za 3 dni nie dostaje „Za tydzień”", () => {
    expect(eventReminderType("2026-10-11T14:00:00+00", NOW, none)).toBeNull();
    expect(eventReminderType("2026-10-15T14:00:00+00", NOW, none)).toBe("7days");
  });

  it("dawny błąd strefy: „Zaraz” nie przychodzi 2 h po czasie", () => {
    // 12:04 w Polsce minęło dwie godziny temu
    expect(eventReminderType("2026-10-08T12:04:00+00", NOW, none)).toBeNull();
    expect(eventReminderType("2026-10-08T14:04:00+00", NOW, none)).toBe("5min");
  });

  it("całodniowe: „Jutro” o 18:00 dzień wcześniej, bez „Zaraz” o północy", () => {
    const start = "2026-10-09T00:00:00+00";
    const end = "2026-10-09T23:59:00+00";
    expect(eventReminderType(start, at("2026-10-08T16:00:00Z"), none, end)).toBe("1day"); // 18:00 PL
    expect(eventReminderType(start, at("2026-10-08T21:57:00Z"), none, end)).toBeNull(); // 23:57 PL
  });

  it("nie powtarza wysłanych", () => {
    expect(eventReminderType("2026-10-09T14:00:00+00", NOW, new Set(["1day"]))).toBeNull();
  });
});
