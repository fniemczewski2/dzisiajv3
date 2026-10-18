// __tests__/lib/reportColors.test.ts

import { DEFAULT_REPORT_HEADING_COLOR } from "@/config/defaults";
import { describe, it, expect } from "vitest";
import { contrastOnWhite, derivePalette, ensureReadable, mix } from "@/lib/reportColors";
import { buildReportDocDefinition, SAMPLE_REPORT } from "@/lib/reportExport";

describe("kolory dokumentu z koloru nagłówków", () => {
  it("ciemny kolor zostaje bez zmian, jasny jest przyciemniany do 4.5:1", () => {
    expect(ensureReadable("#0F7B6C")).toBe("#0F7B6C");
    const yellow = ensureReadable("#F2C94C");
    expect(yellow).not.toBe("#F2C94C");
    expect(contrastOnWhite(yellow)).toBeGreaterThanOrEqual(4.5);
  });

  it("wszystkie kolory tekstu są czytelne na białym", () => {
    for (const c of ["#FFFF00", "#00FFFF", "#B83232", "#0A2947"]) {
      const p = derivePalette(c);
      expect(contrastOnWhite(p.heading)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOnWhite(p.ink)).toBeGreaterThanOrEqual(7);
      expect(contrastOnWhite(p.muted)).toBeGreaterThanOrEqual(4.5);
      expect(contrastOnWhite(p.rule)).toBeLessThan(1.6); // linie tabeli są jasne
    }
  });

  it("bez koloru lub z błędnym – domyślny granat", () => {
    expect(derivePalette(null).heading).toBe(DEFAULT_REPORT_HEADING_COLOR);
    expect(derivePalette("czerwony").heading).toBe(DEFAULT_REPORT_HEADING_COLOR);
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("PDF: bez teł i ozdobnych kresek, nagłówki w wybranym kolorze", () => {
    const def = buildReportDocDefinition(SAMPLE_REPORT, { headingColor: "#0F7B6C" });
    const json = JSON.stringify(def);
    expect(json).not.toContain("fillColor");
    expect(json).not.toContain("canvas");
    expect(def.styles.title.color).toBe("#0F7B6C");
    expect(def.styles.sectionTitle.color).toBe("#0F7B6C");
    expect(json).not.toMatch(/"text":"[A-ZĄĆĘŁŃÓŚŹŻ ]{6,}"/); // brak etykiet wersalikami
  });
});
