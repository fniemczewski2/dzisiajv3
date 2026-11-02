// __tests__/lib/text.test.ts
//
// Funkcje tekstowe bez nawracania i regresja wydajności dla danych z maili i plików (ReDoS).

import { describe, it, expect } from "vitest";
import { isSimpleEmail, trimChars, trimWhere } from "@/lib/text";
import { htmlToPlainText } from "@/lib/mail/htmlText";
import { senderName } from "@/lib/mail/format";
import { findDateMention } from "@/lib/mail/dateMentions";
import { parseFrontMatter } from "@/lib/obsidian/frontMatter";
import { redactMessage } from "@/lib/errorReport";
import { safeSegment } from "@/lib/obsidian/paths";

describe("trimChars / trimWhere", () => {
  it("przycina wskazane znaki z wybranej strony", () => {
    expect(trimChars("--a-b--", "-")).toBe("a-b");
    expect(trimChars("abc==", "=", "end")).toBe("abc");
    expect(trimChars(" .x. ", ". ")).toBe("x");
    expect(trimChars("...", ".")).toBe("");
    expect(trimWhere("\t a \t", (c) => c === " " || c === "\t", "start")).toBe("a \t");
  });
});

describe("isSimpleEmail", () => {
  it.each([
    ["anna@example.pl", true],
    ["a.b+c@sub.example.com", true],
    ["anna@example", false],
    ["@example.pl", false],
    ["a@b@c.pl", false],
    ["anna @example.pl", false],
    ["anna@.pl", false],
    ["anna@example.", false],
  ])("%s → %s", (value, expected) => {
    expect(isSimpleEmail(value)).toBe(expected);
  });

  it("znaki zabronione dla nagłówków", () => {
    expect(isSimpleEmail("a,b@c.pl", ",;<>")).toBe(false);
  });
});

describe("redactMessage", () => {
  it("usuwa adresy e-mail, zostawia resztę", () => {
    expect(redactMessage('Błąd dla "anna@example.pl" (konto)')).toBe('Błąd dla "[email]" (konto)');
    expect(redactMessage("Brak adresu")).toBe("Brak adresu");
  });
});

describe("czas działania na złośliwych danych (bez kwadratowego nawracania)", () => {
  const LONG = 200_000;
  const fast = (fn: () => unknown) => {
    const t = performance.now();
    fn();
    return performance.now() - t;
  };

  it.each([
    ["htmlToPlainText – „<” bez „>”", () => htmlToPlainText("<".repeat(LONG))],
    ["htmlToPlainText – spacje bez nowej linii", () => htmlToPlainText(`${" ".repeat(LONG)}x`)],
    ["senderName – długi nadawca bez „<”", () => senderName(`"${"a".repeat(LONG)}`)],
    ["findDateMention – długi tekst bez dat", () => findDateMention("1 ".repeat(LONG / 2), new Date(2026, 10, 1))],
    ["parseFrontMatter – długa linia klucza", () => parseFrontMatter(`---\nk:${" ".repeat(LONG)}\n---\n`)],
    ["redactMessage – długi token bez „@”", () => redactMessage("a".repeat(LONG))],
    ["safeSegment – kropki i spacje", () => safeSegment(`${". ".repeat(LONG / 2)}x`)],
  ])("%s", (_name, fn) => {
    expect(fast(fn)).toBeLessThan(500);
  });
});
