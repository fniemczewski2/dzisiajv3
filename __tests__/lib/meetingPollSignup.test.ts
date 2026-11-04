// __tests__/lib/meetingPollSignup.test.ts

import { describe, it, expect } from "vitest";
import {
  bookingFailure,
  bookingsToCsv,
  buildSignupDays,
  countBySlot,
  csvCell,
  groupBookings,
  MAX_BOOKING_SLOTS,
  personKey,
  validateBookingPayload,
} from "@/lib/meetingPollSignup";
import type { MeetingPollBooking } from "@/types/meetingPolls";

const slot = (date = "2026-12-01", start_time = "10:00") => ({ date, start_time });

describe("validateBookingPayload", () => {
  const ok = { name: " Anna Nowak ", email: " Anna@Example.COM ", consent: true, slots: [slot(), slot()] };

  it("poprawny zapis: przycięte imię, e-mail małymi literami, zduplikowane sloty scalone", () => {
    expect(validateBookingPayload(ok)).toEqual({ name: "Anna Nowak", email: "anna@example.com", slots: [slot()] });
  });

  it("e-mail jest opcjonalny (pusty lub brak)", () => {
    expect(validateBookingPayload({ ...ok, email: "" })).toMatchObject({ email: null });
    expect(validateBookingPayload({ ...ok, email: undefined })).toMatchObject({ email: null });
  });

  it.each([
    ["brak zgody", { ...ok, consent: false }, /zgod/i],
    ["zgoda jako tekst", { ...ok, consent: "true" }, /zgod/i],
    ["brak imienia", { ...ok, name: "   " }, /imię/i],
    ["za długie imię", { ...ok, name: "x".repeat(101) }, /imię/i],
    ["zły e-mail", { ...ok, email: "to-nie-email" }, /e-mail/i],
    ["brak terminów", { ...ok, slots: [] }, /termin/i],
    ["slots nie jest tablicą", { ...ok, slots: "x" }, /termin/i],
    ["zły format terminu", { ...ok, slots: [{ date: "jutro", start_time: "10:00" }] }, /format/i],
    ["nieistniejąca data", { ...ok, slots: [slot("2026-02-30")] }, /format/i],
  ])("odrzuca: %s", (_label, body, message) => {
    const result = validateBookingPayload(body);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toMatch(message);
  });

  it("odrzuca ciało, które nie jest obiektem, oraz zbyt wiele terminów", () => {
    expect(validateBookingPayload(null)).toHaveProperty("error");
    expect(validateBookingPayload("x")).toHaveProperty("error");
    const many = Array.from({ length: MAX_BOOKING_SLOTS + 1 }, (_, i) =>
      slot("2026-12-01", `${String(Math.floor(i / 2) % 24).padStart(2, "0")}:${i % 2 ? "30" : "00"}`)
    );
    const unique = [...new Map(many.map((s) => [`${s.date}|${s.start_time}`, s])).values()];
    const body = {
      ...ok,
      slots: [
        ...unique,
        ...Array.from({ length: 40 }, (_, i) => slot(`2027-01-${String((i % 28) + 1).padStart(2, "0")}`, "09:00")),
      ],
    };
    const result = validateBookingPayload(body);
    expect(result).toHaveProperty("error");
  });
});

describe("personKey", () => {
  it("e-mail ma pierwszeństwo, bez niego imię; zawsze małymi literami i bez spacji na brzegach", () => {
    expect(personKey("Anna", " ANNA@x.pl ")).toBe("anna@x.pl");
    expect(personKey(" Anna Nowak ", null)).toBe("anna nowak");
    expect(personKey("Anna", "  ")).toBe("anna");
  });
});

describe("bookingFailure", () => {
  it("mapuje kody funkcji bazy na status i komunikat", () => {
    expect(bookingFailure({ ok: false, error: "not_found" }).status).toBe(404);
    expect(bookingFailure({ ok: false, error: "closed" })).toMatchObject({ status: 409 });
    expect(bookingFailure({ ok: false, error: "not_signup" }).status).toBe(409);
    expect(bookingFailure({ ok: false, error: "invalid_name" }).status).toBe(400);
    expect(bookingFailure({ ok: false, error: "cokolwiek" }).status).toBe(500);
  });

  it("komunikaty podają termin i limity", () => {
    expect(bookingFailure({ ok: false, error: "full", slot: slot() }).message).toContain("2026-12-01 10:00");
    expect(bookingFailure({ ok: false, error: "already_booked", slot: slot() }).message).toContain("2026-12-01 10:00");
    expect(bookingFailure({ ok: false, error: "limit", max: 1, existing: 1 }).message).toBe(
      "Możesz zapisać się na najwyżej 1 termin (masz już 1)."
    );
    expect(bookingFailure({ ok: false, error: "limit", max: 3, existing: 2 }).message).toContain("3 terminów");
  });
});

describe("buildSignupDays / countBySlot", () => {
  it("sloty każdego dnia z zajętością, dni posortowane; pełny slot oznaczony", () => {
    const days = buildSignupDays(
      ["2026-12-02", "2026-12-01"],
      "10:00:00",
      "11:00:00",
      30,
      [{ date: "2026-12-01", start_time: "10:00:00", booked: 2 }],
      2
    );
    expect(days.map((d) => d.date)).toEqual(["2026-12-01", "2026-12-02"]);
    expect(days[0].slots).toEqual([
      { start_time: "10:00", end_time: "10:30", booked: 2, free: 0, full: true },
      { start_time: "10:30", end_time: "11:00", booked: 0, free: 2, full: false },
    ]);
    expect(days[1].slots.every((s) => s.free === 2)).toBe(true);
  });

  it("wolnych miejsc nigdy mniej niż 0 (np. po zmniejszeniu pojemności)", () => {
    const [day] = buildSignupDays(
      ["2026-12-01"],
      "10:00",
      "10:30",
      30,
      [{ date: "2026-12-01", start_time: "10:00", booked: 5 }],
      2
    );
    expect(day.slots[0]).toMatchObject({ booked: 5, free: 0, full: true });
  });

  it("countBySlot zlicza wiersze według slotu i normalizuje czas do HH:MM", () => {
    expect(
      countBySlot([
        { date: "2026-12-01", start_time: "10:00:00" },
        { date: "2026-12-01", start_time: "10:00" },
        { date: "2026-12-01", start_time: "10:30:00" },
      ])
    ).toEqual([
      { date: "2026-12-01", start_time: "10:00", booked: 2 },
      { date: "2026-12-01", start_time: "10:30", booked: 1 },
    ]);
  });
});

const booking = (over: Partial<MeetingPollBooking>): MeetingPollBooking => ({
  id: "b1",
  poll_id: "p",
  date: "2026-12-01",
  start_time: "10:00:00",
  name: "Anna",
  email: "anna@x.pl",
  consent_at: "2026-11-05T10:00:00Z",
  created_at: "2026-11-05T10:00:00Z",
  ...over,
});

describe("groupBookings", () => {
  it("grupy chronologicznie, w slocie według czasu zapisu", () => {
    const groups = groupBookings(
      [
        booking({ id: "3", date: "2026-12-02" }),
        booking({ id: "2", created_at: "2026-11-05T11:00:00Z", name: "Bartek" }),
        booking({ id: "1" }),
        booking({ id: "4", start_time: "09:30:00" }),
      ],
      30
    );
    expect(groups.map((g) => `${g.date} ${g.start_time}-${g.end_time}`)).toEqual([
      "2026-12-01 09:30-10:00",
      "2026-12-01 10:00-10:30",
      "2026-12-02 10:00-10:30",
    ]);
    expect(groups[1].bookings.map((b) => b.id)).toEqual(["1", "2"]);
  });
});

describe("csvCell / bookingsToCsv", () => {
  it("cytuje separator, cudzysłów i nowe linie", () => {
    expect(csvCell("Anna")).toBe("Anna");
    expect(csvCell("Nowak; Anna")).toBe('"Nowak; Anna"');
    expect(csvCell('Ania "Ana"')).toBe('"Ania ""Ana"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(null)).toBe("");
  });

  it.each(['=HYPERLINK("http://x")', "+48600100200", "-2+3", "@SUM(A1)", "\t=1+1"])(
    "neutralizuje formułę (CSV injection): %j",
    (value) => {
      expect(csvCell(value).replace(/^"/, "").startsWith("'")).toBe(true);
    }
  );

  it("plik: BOM, nagłówek, wiersze chronologicznie, CRLF; imię z formułą jest zneutralizowane", () => {
    const csv = bookingsToCsv(
      [
        booking({ id: "2", name: "=cmd|' /C calc'!A0", email: null, created_at: "2026-11-05T11:00:00Z" }),
        booking({ id: "1" }),
      ],
      30
    );
    const lines = csv.split("\r\n");
    expect(csv.startsWith("\uFEFFData;Od;Do;Imię i nazwisko;E-mail;Zapisano")).toBe(true);
    expect(lines[1]).toContain("2026-12-01;10:00;10:30;Anna;anna@x.pl;");
    expect(lines[2]).toContain(";'=cmd|' /C calc'!A0;;");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("brak zapisów: sam nagłówek", () => {
    expect(bookingsToCsv([], 30)).toBe("\uFEFFData;Od;Do;Imię i nazwisko;E-mail;Zapisano\r\n");
  });
});
