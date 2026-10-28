// __tests__/lib/mail/inboxActions.test.ts

import { describe, it, expect } from "vitest";
import { inboxActionRow } from "@/lib/mail/inboxActions";

const ICS = [
  "BEGIN:VEVENT",
  "SUMMARY:Przegląd",
  "DTSTART:20261027T100000Z",
  "DTEND:20261027T110000Z",
  "END:VEVENT",
].join("\r\n");

const payload = (over: Record<string, unknown> = {}) => ({
  recipient: "p-0123456789abcdef0123456789abcdef@poczta.dzisiaj.fun",
  from: "anna@example.com",
  subject: "Re: Spotkanie",
  text: "Zapraszam.",
  attachments: [],
  receivedAt: "2026-10-26T10:00:00.000Z",
  ...over,
});

describe("inboxActionRow", () => {
  it("zadanie z przekierowanej wiadomości ma tytuł Odpowiedz i kategorię poczta", () => {
    const res = inboxActionRow(payload(), "task", "u1", "2026-10-26");
    expect(res).toMatchObject({
      kind: "task",
      row: { title: "Odpowiedz: Spotkanie", category: "poczta", user_id: "u1" },
    });
  });

  it("wydarzenie z załącznika ICS", () => {
    const res = inboxActionRow(
      payload({ attachments: [{ filename: "i.ics", mimeType: "text/calendar", icsText: ICS }] }),
      "event",
      "u1",
      "2026-10-26"
    );
    expect(res).toMatchObject({ kind: "event", row: { title: "Przegląd", user_id: "u1" } });
  });

  it("wydarzenie bez zaproszenia zwraca błąd", () => {
    expect(inboxActionRow(payload(), "event", "u1", "2026-10-26")).toEqual({
      error: "W tej wiadomości nie wykryto zaproszenia.",
    });
  });

  it("nieczytelny ładunek zwraca błąd", () => {
    expect(inboxActionRow({ nie: "wiadomość" }, "task", "u1", "2026-10-26")).toEqual({
      error: "Nie udało się odczytać wiadomości.",
    });
  });
});
