// __tests__/lib/mail/dateMentions.test.ts

import { describe, it, expect } from "vitest";
import { findDateMention } from "@/lib/mail/dateMentions";
import { detectInvitation } from "@/lib/mail/invitations";

const NOW = new Date(2026, 9, 29, 12, 0); // 29.10.2026, czas lokalny

describe("findDateMention", () => {
  it("format numeryczny z godziną i przedziałem", () => {
    expect(findDateMention("Spotkanie 5.11.2026 o 10:00–11:30 w biurze.", NOW)).toEqual({
      start: "2026-11-05T10:00:00",
      end: "2026-11-05T11:30:00",
      allDay: false,
    });
  });

  it("ISO i miesiąc słownie; bez godziny = cały dzień", () => {
    expect(findDateMention("Termin: 2026-11-20.", NOW)).toEqual({ start: "2026-11-20", end: null, allDay: true });
    expect(findDateMention("Zapraszam 12 listopada 2026, godz. 9.15", NOW)?.start).toBe("2026-11-12T09:15:00");
  });

  it("miesiąc bez roku: najbliższy przyszły (styczeń → przyszły rok)", () => {
    expect(findDateMention("Zjazd 15 stycznia o 9:00", NOW)?.start).toBe("2027-01-15T09:00:00");
    expect(findDateMention("Spotkanie 3 listopada", NOW)?.start).toBe("2026-11-03");
  });

  it("pomija daty przeszłe, niepoprawne i cytowaną historię odpowiedzi", () => {
    expect(findDateMention("Faktura z 12.10.2026 w załączniku.", NOW)).toBeNull();
    expect(findDateMention("Data 31.02.2027.", NOW)).toBeNull();
    expect(
      findDateMention("Dziękuję.\n\nW dniu 2.11.2026 Jan Kowalski napisał:\n> spotkajmy się 10.11.2026", NOW)
    ).toBeNull();
    expect(findDateMention("Ok\n> 10.11.2026 o 10:00", NOW)).toBeNull();
  });

  it("bierze termin występujący najwcześniej w tekście", () => {
    expect(findDateMention("Najpierw 20.11.2026, potem 2026-11-10.", NOW)?.start).toBe("2026-11-20");
  });
});

describe("detectInvitation – termin w treści jako podpowiedź", () => {
  it("bez .ics i bez linku: źródło date z tematem jako tytułem", () => {
    const inv = detectInvitation(
      { subject: "Zebranie zarządu", text: "Proponuję 6.11.2026 o 17:00.", attachments: [] },
      NOW
    );
    expect(inv).toMatchObject({
      source: "date",
      title: "Zebranie zarządu",
      start: "2026-11-06T17:00:00",
      allDay: false,
    });
  });

  it("link do spotkania z datą w treści: zaproszenie z terminem (można dodać do kalendarza)", () => {
    const inv = detectInvitation(
      { subject: "Spotkanie", text: "Dołącz 7.11.2026 o 18:00: https://meet.google.com/abc-defg-hij", attachments: [] },
      NOW
    );
    expect(inv).toMatchObject({ source: "link", start: "2026-11-07T18:00:00" });
  });

  it("brak daty i zaproszenia: null", () => {
    expect(detectInvitation({ subject: "Faktura", text: "W załączniku", attachments: [] }, NOW)).toBeNull();
  });
});
