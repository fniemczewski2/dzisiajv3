// __tests__/lib/sanitize.test.ts

import { describe, it, expect } from "vitest";
import { sanitizeHref, sanitizeJsonLd, validateEmail, validateFinalizeSlot, validateSlot } from "@/lib/sanitize";

describe("sanitizeHref", () => {
  it.each([
    ["https://a.pl/x?y=1", "https://a.pl/x?y=1"],
    ["a.pl", "https://a.pl/"],
    ["mailto:anna@a.pl", "mailto:anna@a.pl"],
    ["tel:+48600000000", "tel:+48600000000"],
  ])("przepuszcza %s", (raw, expected) => {
    expect(sanitizeHref(raw)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<b>x</b>",
    "vbscript:x",
    "file:///etc/passwd",
    "",
    "   ",
  ])("odrzuca %j", (raw) => {
    expect(sanitizeHref(raw)).toBeNull();
  });
});

describe("sanitizeJsonLd", () => {
  it("nie pozwala zamknąć znacznika <script> ani wstrzyknąć HTML", () => {
    const out = sanitizeJsonLd({ name: "</script><script>alert(1)</script>&" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>&" });
  });
});

describe("validateEmail", () => {
  it("normalizuje i sprawdza format", () => {
    expect(validateEmail("  Anna@Example.PL ")).toBe("anna@example.pl");
    expect(validateEmail("brak-malpy.pl")).toBeNull();
    expect(validateEmail("a@b")).toBeNull();
    expect(validateEmail(42)).toBeNull();
  });
});

describe("validateSlot / validateFinalizeSlot", () => {
  it("odrzuca nieistniejące daty (wcześniej trafiały do tabeli events)", () => {
    expect(validateSlot({ date: "2026-02-30", start_time: "10:00" })).toBeNull();
    expect(validateSlot({ date: "2026-13-01", start_time: "10:00" })).toBeNull();
    expect(validateFinalizeSlot({ date: "2026-02-30", start_time: "10:00", end_time: "11:00" })).toBeNull();
    expect(validateSlot({ date: "2028-02-29", start_time: "10:00" })).toEqual({
      date: "2028-02-29",
      start_time: "10:00",
    });
  });

  it("godziny w formacie HH:MM w zakresie doby", () => {
    expect(validateSlot({ date: "2026-11-02", start_time: "24:00" })).toBeNull();
    expect(validateSlot({ date: "2026-11-02", start_time: "9:00" })).toBeNull();
    expect(validateSlot(null)).toBeNull();
  });

  it("finalizacja: koniec po początku, limity długości, przycięcie tekstu", () => {
    expect(validateFinalizeSlot({ date: "2026-11-02", start_time: "11:00", end_time: "11:00" })).toBeNull();
    expect(
      validateFinalizeSlot({ date: "2026-11-02", start_time: "10:00", end_time: "11:00", title: "x".repeat(10_000) })
    ).toBeNull();
    expect(
      validateFinalizeSlot({
        date: "2026-11-02",
        start_time: "10:00",
        end_time: "11:00",
        title: "  Zarząd ",
        place: " Sala ",
      })
    ).toEqual({
      date: "2026-11-02",
      start_time: "10:00",
      end_time: "11:00",
      title: "Zarząd",
      place: "Sala",
    });
  });
});
