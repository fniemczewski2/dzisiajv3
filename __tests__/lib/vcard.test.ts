// __tests__/lib/vcard.test.ts

import { describe, it, expect } from "vitest";
import {
  buildVCard,
  escVCardValue,
  sanitizeTypeToken,
  safeFileName,
  structuredName,
  vcardContentDisposition,
  vcardType,
} from "@/lib/vcard";

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

describe("structuredName (pole N)", () => {
  it("dzieli pełne imię i nazwisko: ostatni wyraz to nazwisko", () => {
    expect(structuredName("Jan Maria Kowalski")).toBe("Kowalski;Jan Maria;;;");
  });
  it("jedno słowo trafia do nazwiska", () => {
    expect(structuredName("Madonna")).toBe("Madonna;;;;");
  });
  it("używa osobnych pól, gdy są podane", () => {
    expect(structuredName("x", "Nowak", "Anna")).toBe("Nowak;Anna;;;");
  });
});

describe("buildVCard", () => {
  it("zawiera wymagane pole N i linie CRLF", () => {
    const vcf = buildVCard({ fullName: "Anna Nowak", phones: [{ type: "Komórka", number: "600 100 200" }] });
    expect(vcf.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Nowak;Anna;;;",
      "FN:Anna Nowak",
      "TEL;TYPE=CELL,VOICE:600100200",
      "END:VCARD",
      "",
    ]);
  });
  it("nie pozwala wstrzyknąć nowej linii przez dane", () => {
    const vcf = buildVCard({ fullName: "A\nEND:VCARD\nBEGIN:VCARD" });
    expect(vcf.match(/^BEGIN:VCARD$/gm)).toHaveLength(1);
  });
});

describe("vcardContentDisposition", () => {
  it("podaje nazwę ASCII i pełną nazwę UTF-8", () => {
    expect(vcardContentDisposition("Łucja Świątek")).toBe(
      `attachment; filename="Lucja_Swiatek.vcf"; filename*=UTF-8''${encodeURIComponent("Łucja_Świątek.vcf")}`
    );
  });
});

describe("vcardType", () => {
  it("tłumaczy polskie etykiety na typy vCard", () => {
    expect(vcardType("Komórka")).toBe("CELL");
    expect(vcardType("Służbowy")).toBe("WORK");
    expect(vcardType("Prywatny")).toBe("HOME");
  });
  it("nieznaną etykietę oczyszcza jak dawniej", () => {
    expect(vcardType("Instagram")).toBe("INSTAGRAM");
    expect(vcardType(";X:Y")).toBe("XY");
  });
});
