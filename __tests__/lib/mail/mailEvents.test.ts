// __tests__/lib/mail/mailEvents.test.ts

import { describe, it, expect } from "vitest";
import { buildMailEventRow } from "@/lib/server/mailEvents";
import type { Invitation } from "@/lib/mail/invitations";

const base: Invitation = {
  source: "ics",
  title: "Przegląd",
  start: null,
  end: null,
  allDay: false,
  location: null,
  conferenceLinks: [],
};

function row(inv: Partial<Invitation>) {
  const result = buildMailEventRow({ ...base, ...inv }, "u1");
  if (!("row" in result)) throw new Error("oczekiwano wiersza");
  return result.row;
}

describe("buildMailEventRow – format aplikacji (YYYY-MM-DDTHH:MM:SS, czas polski)", () => {
  it("UTC po zmianie czasu (27.10.2026, UTC+1)", () => {
    const r = row({ start: "2026-10-27T10:00:00Z", end: "2026-10-27T11:00:00Z" });
    expect(r.start_time).toBe("2026-10-27T11:00:00");
    expect(r.end_time).toBe("2026-10-27T12:00:00");
  });

  it("UTC w czasie letnim (czerwiec, UTC+2)", () => {
    expect(row({ start: "2026-06-10T10:00:00Z" }).start_time).toBe("2026-06-10T12:00:00");
  });

  it("czas bez strefy jest czasem polskim bez zmian", () => {
    expect(row({ start: "2026-10-27T09:30:00" }).start_time).toBe("2026-10-27T09:30:00");
  });

  it("brak końca daje godzinę", () => {
    expect(row({ start: "2026-10-27T09:00:00" }).end_time).toBe("2026-10-27T10:00:00");
  });

  it("całodniowe: od północy do północy następnego dnia; DTEND z ICS jest zachowany", () => {
    const r = row({ start: "2026-10-27", allDay: true });
    expect(r.start_time).toBe("2026-10-27T00:00:00");
    expect(r.end_time).toBe("2026-10-28T00:00:00");
    expect(row({ start: "2026-10-27", end: "2026-10-30", allDay: true }).end_time).toBe("2026-10-30T00:00:00");
  });

  it("miejsce: lokalizacja, potem pierwszy link konferencji, w ostateczności pusty tekst", () => {
    expect(row({ start: "2026-10-27T09:00:00", location: "Sala 3" }).place).toBe("Sala 3");
    expect(row({ start: "2026-10-27T09:00:00", conferenceLinks: ["https://zoom.us/j/1"] }).place).toBe(
      "https://zoom.us/j/1"
    );
    expect(row({ start: "2026-10-27T09:00:00" }).place).toBe("");
  });

  it("bez daty początku zwraca błąd", () => {
    expect(buildMailEventRow(base, "u1")).toEqual({ error: "W wiadomości nie ma daty wydarzenia." });
  });
});
