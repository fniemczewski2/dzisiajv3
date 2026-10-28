// __tests__/lib/mail/searchFormat.test.ts

import { describe, it, expect } from "vitest";
import { gmailQuery, MAX_SEARCH_LENGTH, normalizeSearchQuery, outlookSearchParam } from "@/lib/mail/search";
import { formatMailDate, senderName } from "@/lib/mail/format";
import { htmlToPlainText } from "@/lib/mail/htmlText";

describe("wyszukiwanie", () => {
  it("normalizuje frazę i odrzuca pustą", () => {
    expect(normalizeSearchQuery("  faktura \n  październik ")).toBe("faktura październik");
    expect(normalizeSearchQuery("   ")).toBeNull();
    expect(normalizeSearchQuery(42)).toBeNull();
    expect(normalizeSearchQuery("x".repeat(500))).toHaveLength(MAX_SEARCH_LENGTH);
  });
  it("Gmail szuka zawsze w folderze odbiorczym", () => {
    expect(gmailQuery(null)).toBe("in:inbox");
    expect(gmailQuery("from:anna")).toBe("in:inbox from:anna");
  });
  it("Outlook: fraza w cudzysłowie bez wstrzykniętych cudzysłowów", () => {
    expect(outlookSearchParam('umowa" OR "x')).toBe('"umowa  OR  x"');
  });
});

describe("formatowanie", () => {
  const now = new Date("2026-10-28T12:00:00");
  it("dziś godzina, w tym roku dzień i miesiąc, starsze pełna data", () => {
    expect(formatMailDate("2026-10-28T09:05:00", now)).toBe("09:05");
    expect(formatMailDate("2026-03-03T09:05:00", now)).toBe("3 mar");
    expect(formatMailDate("2025-10-03T09:05:00", now)).toBe("3.10.2025");
    expect(formatMailDate("nie data", now)).toBe("");
    expect(formatMailDate(null, now)).toBe("");
  });
  it("nazwa nadawcy", () => {
    expect(senderName('"Anna K." <anna@x.pl>')).toBe("Anna K.");
    expect(senderName("<anna@x.pl>")).toBe("anna@x.pl");
    expect(senderName("anna@x.pl")).toBe("anna@x.pl");
  });
});

describe("htmlToPlainText", () => {
  it("usuwa style i znaczniki, zachowuje adresy linków i encje", () => {
    const text = htmlToPlainText(
      '<style>p{}</style><p>Spotkanie&nbsp;&amp; rozmowa</p><a href="https://zoom.us/j/1">dołącz</a><br>koniec'
    );
    expect(text).toContain("Spotkanie & rozmowa");
    expect(text).toContain("dołącz https://zoom.us/j/1");
    expect(text).not.toContain("p{}");
  });
});
