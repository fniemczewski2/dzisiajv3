import { describe, it, expect } from "vitest";
import { escVCardValue, sanitizeTypeToken, safeFileName } from "@/pages/api/vcard";

describe("escVCardValue", () => {
  it("escapes backslashes, semicolons and commas per the vCard spec", () => {
    expect(escVCardValue("Kowalski; Nowak, S.A.")).toBe("Kowalski\\; Nowak\\, S.A.");
  });

  it("converts newlines to the literal \\n escape sequence", () => {
    expect(escVCardValue("linia 1\nlinia 2")).toBe("linia 1\\nlinia 2");
  });

  it("leaves a plain value untouched", () => {
    expect(escVCardValue("Jan Kowalski")).toBe("Jan Kowalski");
  });
});

describe("sanitizeTypeToken", () => {
  it("uppercases and strips characters outside [A-Za-z0-9-]", () => {
    expect(sanitizeTypeToken("mobile-2")).toBe("MOBILE-2");
    expect(sanitizeTypeToken("mobile #2")).toBe("MOBILE2");
  });

  it("falls back to OTHER when nothing valid remains (rejects injection attempts)", () => {
    expect(sanitizeTypeToken(";EVIL:PAYLOAD\nBEGIN:VCARD")).not.toContain(":");
    expect(sanitizeTypeToken("!!!")).toBe("OTHER");
  });
});

describe("safeFileName", () => {
  it("replaces unsafe characters with underscores", () => {
    expect(safeFileName("Jan Kowalski / Wizytówka")).toBe("Jan_Kowalski_Wizytówka");
  });

  it("falls back to a default name for empty or undefined input", () => {
    expect(safeFileName(undefined)).toBe("wizytowka");
    expect(safeFileName("   ")).not.toBe("");
  });

  it("keeps Polish diacritics, which are valid in filenames", () => {
    expect(safeFileName("Świątecka")).toBe("Świątecka");
  });
});
