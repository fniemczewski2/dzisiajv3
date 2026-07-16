import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatTime,
  localDateTimeToISO,
  parseEventDate,
  dateToTimestamp,
  eventSpansDate,
  getAppDate,
  getAppDateTime,
} from "@/lib/dateUtils";
import type { Event } from "@/types/events";

const baseEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "evt-1",
  user_id: "user-1",
  title: "Test event",
  start_time: "2024-03-10 10:00:00+00",
  end_time: "2024-03-12 12:00:00+00",
  repeat: "none",
  ...overrides,
});

describe("formatTime", () => {
  it("extracts HH:mm from a timestamp with a timezone suffix", () => {
    expect(formatTime("2024-03-15T14:30:00+02")).toBe("14:30");
  });

  it("keeps zero-padded hours and minutes", () => {
    expect(formatTime("2024-03-05T09:05:00+02")).toBe("09:05");
  });

  it("prefixes day.month when includeDate is true", () => {
    expect(formatTime("2024-03-15T14:30:00+02", true)).toBe("15.03 14:30");
  });

  it("handles a space-separated timestamp (Postgres style) the same way", () => {
    expect(formatTime("2024-03-15 14:30:00+02")).toBe("14:30");
  });
});

describe("localDateTimeToISO", () => {
  it("appends seconds and a UTC-ish offset when the input has no seconds", () => {
    expect(localDateTimeToISO("2024-03-15T14:30")).toBe("2024-03-15T14:30:00+00");
  });

  it("leaves an already-complete datetime untouched apart from the offset", () => {
    expect(localDateTimeToISO("2024-03-15T14:30:45")).toBe("2024-03-15T14:30:45+00");
  });
});

describe("parseEventDate", () => {
  it("parses a Postgres-style timestamp into the matching local Date fields", () => {
    const d = parseEventDate("2024-03-15 14:30:00+02");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // marzec = index 2
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(0);
  });

  it("defaults the time to midnight when only a date is given", () => {
    const d = parseEventDate("2024-03-15");
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("ignores milliseconds if present", () => {
    const d = parseEventDate("2024-03-15T14:30:00.123");
    expect(d.getSeconds()).toBe(0);
  });
});

describe("dateToTimestamp", () => {
  it("round-trips a Date back into the app's timestamp format", () => {
    const d = new Date(2024, 2, 15, 14, 30, 45);
    expect(dateToTimestamp(d)).toBe("2024-03-15T14:30:45+00");
  });

  it("zero-pads single-digit month/day/hour/minute/second", () => {
    const d = new Date(2024, 0, 5, 9, 5, 3);
    expect(dateToTimestamp(d)).toBe("2024-01-05T09:05:03+00");
  });
});

describe("eventSpansDate", () => {
  const multiDayEvent = baseEvent({
    start_time: "2024-03-10 10:00:00+00",
    end_time: "2024-03-12 12:00:00+00",
  });

  it("returns true for a date strictly inside the event range", () => {
    expect(eventSpansDate(multiDayEvent, new Date(2024, 2, 11))).toBe(true);
  });

  it("is inclusive of the start date", () => {
    expect(eventSpansDate(multiDayEvent, new Date(2024, 2, 10))).toBe(true);
  });

  it("is inclusive of the end date", () => {
    expect(eventSpansDate(multiDayEvent, new Date(2024, 2, 12))).toBe(true);
  });

  it("returns false for a date before the event starts", () => {
    expect(eventSpansDate(multiDayEvent, new Date(2024, 2, 9))).toBe(false);
  });

  it("returns false for a date after the event ends", () => {
    expect(eventSpansDate(multiDayEvent, new Date(2024, 2, 13))).toBe(false);
  });

  it("ignores the time-of-day component of the selected date", () => {
    const singleDay = baseEvent({
      start_time: "2024-03-10 08:00:00+00",
      end_time: "2024-03-10 09:00:00+00",
    });
    expect(eventSpansDate(singleDay, new Date(2024, 2, 10, 23, 59))).toBe(true);
  });
});

describe("getAppDate / getAppDateTime (Europe/Warsaw)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the Warsaw calendar date for a UTC instant earlier the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T10:00:00Z")); // lato, Warszawa = UTC+2
    expect(getAppDate()).toBe("2024-06-15");
  });

  it("rolls over to the next day across the UTC/Warsaw midnight boundary", () => {
    vi.useFakeTimers();
    // 23:00 UTC w czerwcu to już 01:00 następnego dnia w Warszawie (UTC+2).
    vi.setSystemTime(new Date("2024-06-14T23:00:00Z"));
    expect(getAppDate()).toBe("2024-06-15");
  });

  it("getAppDateTime reflects the same Warsaw wall-clock hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-14T23:00:00Z"));
    const appNow = getAppDateTime();
    expect(appNow.getHours()).toBe(1);
  });
});
