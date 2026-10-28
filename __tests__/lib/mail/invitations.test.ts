// __tests__/lib/mail/invitations.test.ts

import { describe, it, expect } from "vitest";
import { detectInvitation, findConferenceLinks, parseIcs, parseIcsDate } from "@/lib/mail/invitations";

const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "SUMMARY:Przegląd projektu",
  "DTSTART:20261027T100000Z",
  "DTEND:20261027T110000Z",
  "LOCATION:Sala 3",
  "ORGANIZER;CN=Anna:mailto:anna@example.com",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcsDate", () => {
  it("UTC zachowuje strefę", () => {
    expect(parseIcsDate("20261027T100000Z")).toEqual({ iso: "2026-10-27T10:00:00Z", allDay: false });
  });
  it("czas lokalny bez strefy", () => {
    expect(parseIcsDate("20261027T100000")).toEqual({ iso: "2026-10-27T10:00:00", allDay: false });
  });
  it("całodniowe wydarzenie", () => {
    expect(parseIcsDate("20261027")).toEqual({ iso: "2026-10-27", allDay: true });
  });
  it("niepoprawny format zwraca null", () => {
    expect(parseIcsDate("jutro")).toBeNull();
  });
});

describe("parseIcs", () => {
  it("odczytuje tytuł, termin, miejsce i organizatora", () => {
    expect(parseIcs(ICS)).toEqual({
      summary: "Przegląd projektu",
      start: "2026-10-27T10:00:00Z",
      end: "2026-10-27T11:00:00Z",
      allDay: false,
      location: "Sala 3",
      organizer: "anna@example.com",
    });
  });
  it("bez VEVENT albo bez DTSTART zwraca null", () => {
    expect(parseIcs("BEGIN:VCALENDAR\r\nEND:VCALENDAR")).toBeNull();
    expect(parseIcs("BEGIN:VEVENT\r\nSUMMARY:x\r\nEND:VEVENT")).toBeNull();
  });
  it("obsługuje składanie linii (RFC 5545)", () => {
    const folded = ICS.replace("SUMMARY:Przegląd projektu", "SUMMARY:Przegląd\r\n  projektu");
    expect(parseIcs(folded)?.summary).toBe("Przegląd projektu");
  });
});

describe("findConferenceLinks", () => {
  it("znajduje linki Zoom, Meet i Teams bez końcowej interpunkcji", () => {
    const text =
      "Dołącz: https://zoom.us/j/123456. Meet: https://meet.google.com/abc-defg-hij, Teams https://teams.microsoft.com/l/meetup-join/x";
    expect(findConferenceLinks(text)).toEqual([
      "https://zoom.us/j/123456",
      "https://meet.google.com/abc-defg-hij",
      "https://teams.microsoft.com/l/meetup-join/x",
    ]);
  });
  it("ignoruje obce domeny", () => {
    expect(findConferenceLinks("https://example.com/spotkanie")).toEqual([]);
  });
});

describe("detectInvitation", () => {
  it("załącznik .ics daje zaproszenie źródłem ics", () => {
    const inv = detectInvitation({
      subject: "Zaproszenie",
      text: "",
      attachments: [{ attachmentId: "a1", filename: "invite.ics", mimeType: "text/calendar", icsText: ICS }],
    });
    expect(inv).toMatchObject({
      source: "ics",
      title: "Przegląd projektu",
      location: "Sala 3",
      start: "2026-10-27T10:00:00Z",
    });
  });
  it("sama wiadomość z linkiem i słowem kluczowym to zaproszenie źródłem link", () => {
    const inv = detectInvitation({
      subject: "Spotkanie w czwartek",
      text: "Zapraszam na rozmowę: https://zoom.us/j/999",
      attachments: [],
    });
    expect(inv).toMatchObject({
      source: "link",
      title: "Spotkanie w czwartek",
      start: null,
      conferenceLinks: ["https://zoom.us/j/999"],
    });
  });
  it("zwykła wiadomość bez zaproszenia zwraca null", () => {
    expect(detectInvitation({ subject: "Faktura", text: "W załączniku", attachments: [] })).toBeNull();
  });
  it("link bez słowa kluczowego nie jest zaproszeniem", () => {
    expect(detectInvitation({ subject: "Artykuł", text: "https://zoom.us/blog", attachments: [] })).toBeNull();
  });
});

import { zonedWallTimeToUtc } from "@/lib/mail/invitations";

describe("strefy czasowe w ICS (TZID)", () => {
  const ics = (dtstart: string) => ["BEGIN:VEVENT", "SUMMARY:Rozmowa", dtstart, "END:VEVENT"].join("\r\n");

  it("strefa IANA jest przeliczana na UTC (Nowy Jork, EDT = UTC-4)", () => {
    expect(parseIcs(ics("DTSTART;TZID=America/New_York:20261027T100000"))?.start).toBe("2026-10-27T14:00:00Z");
  });

  it("Europe/Warsaw zostaje czasem lokalnym", () => {
    expect(parseIcs(ics("DTSTART;TZID=Europe/Warsaw:20261027T100000"))?.start).toBe("2026-10-27T10:00:00");
  });

  it("nazwa spoza IANA (strefa Windows) zostaje czasem lokalnym", () => {
    expect(parseIcs(ics('DTSTART;TZID="Central European Standard Time":20261027T100000'))?.start).toBe(
      "2026-10-27T10:00:00"
    );
  });

  it("przeliczenie uwzględnia zmianę czasu w danej strefie", () => {
    expect(zonedWallTimeToUtc("2026-07-01T12:00:00", "Europe/London")).toBe("2026-07-01T11:00:00Z");
    expect(zonedWallTimeToUtc("2026-12-01T12:00:00", "Europe/London")).toBe("2026-12-01T12:00:00Z");
    expect(zonedWallTimeToUtc("2026-12-01T12:00:00", "Nie/Istnieje")).toBeNull();
  });
});
