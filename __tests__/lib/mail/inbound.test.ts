// __tests__/lib/mail/inbound.test.ts

import { describe, it, expect } from "vitest";
import { invitationOf, MAX_INBOUND_TEXT, parseInboundPayload } from "@/lib/mail/inbound";
import { planForwardingCreate, MAX_FORWARDING_ADDRESSES } from "@/lib/mail/forwarding";
import { isInboundAuthorized } from "@/lib/server/inboundAuth";

const valid = {
  recipient: "P-0123456789ABCDEF0123456789ABCDEF@Poczta.dzisiaj.fun",
  from: "anna@example.com",
  subject: "Spotkanie",
  text: "Zapraszam na rozmowę.",
  attachments: [],
};

describe("parseInboundPayload", () => {
  it("przyjmuje poprawną wiadomość i normalizuje adres odbiorcy", () => {
    const msg = parseInboundPayload(valid);
    expect(msg?.recipient).toBe("p-0123456789abcdef0123456789abcdef@poczta.dzisiaj.fun");
    expect(msg?.attachments).toEqual([]);
  });

  it("odrzuca brak nadawcy, złego odbiorcę i nie-obiekt", () => {
    expect(parseInboundPayload({ ...valid, from: undefined })).toBeNull();
    expect(parseInboundPayload({ ...valid, recipient: "to nie adres" })).toBeNull();
    expect(parseInboundPayload("tekst")).toBeNull();
    expect(parseInboundPayload(null)).toBeNull();
  });

  it("odrzuca zbyt długą treść", () => {
    expect(parseInboundPayload({ ...valid, text: "x".repeat(MAX_INBOUND_TEXT + 1) })).toBeNull();
  });

  it("zachowuje tylko ICS z treścią; binarne załączniki trafiają bez treści", () => {
    const msg = parseInboundPayload({
      ...valid,
      attachments: [
        { filename: "zdjecie.png", mimeType: "image/png" },
        { filename: "invite.ics", mimeType: "text/calendar", icsText: "BEGIN:VCALENDAR" },
      ],
    });
    expect(msg?.attachments).toEqual([
      { attachmentId: "inbound-0", filename: "zdjecie.png", mimeType: "image/png" },
      { attachmentId: "inbound-1", filename: "invite.ics", mimeType: "text/calendar", icsText: "BEGIN:VCALENDAR" },
    ]);
  });

  it("zaproszenie z ICS jest wykrywane po parsowaniu", () => {
    const ics = ["BEGIN:VEVENT", "SUMMARY:Przegląd", "DTSTART:20261027T100000Z", "END:VEVENT"].join("\r\n");
    const msg = parseInboundPayload({
      ...valid,
      attachments: [{ filename: "i.ics", mimeType: "text/calendar", icsText: ics }],
    });
    expect(msg && invitationOf(msg)).toMatchObject({ source: "ics", title: "Przegląd", start: "2026-10-27T10:00:00Z" });
  });
});

describe("planForwardingCreate", () => {
  it("pozwala poniżej limitu i blokuje od limitu", () => {
    expect(planForwardingCreate(MAX_FORWARDING_ADDRESSES - 1)).toEqual({ ok: true });
    expect(planForwardingCreate(MAX_FORWARDING_ADDRESSES)).toEqual({ ok: false, reason: "limit" });
  });
});

describe("isInboundAuthorized", () => {
  it("bez skonfigurowanego sekretu zawsze odmawia", () => {
    expect(isInboundAuthorized(undefined, "cokolwiek")).toBe(false);
    expect(isInboundAuthorized("", "")).toBe(false);
  });
  it("akceptuje tylko poprawny sekret", () => {
    expect(isInboundAuthorized("s3cret", "s3cret")).toBe(true);
    expect(isInboundAuthorized("s3cret", "s3cre")).toBe(false);
    expect(isInboundAuthorized("s3cret", undefined)).toBe(false);
  });
});
