// __tests__/lib/boundaryParsing.test.ts
//
// Granice parsowania, które zmieniono przy usuwaniu regexów o nakładających się kwantyfikatorach (S8786).

import { describe, it, expect } from "vitest";
import { reportValues } from "@/lib/obsidian/importItems";
import { normalizeFolder } from "@/lib/notes/folders";

describe("nazwa pliku protokołu → data i temat", () => {
  it("data, spacja, temat", () => {
    const v = reportValues("", "2026-11-02 Zebranie zarządu", "2026-01-01");
    expect(v.date).toBe("2026-11-02");
    expect(v.topic).toBe("Zebranie zarządu");
  });

  it("wielokrotne spacje między datą a tematem nie wchodzą do tematu", () => {
    const v = reportValues("", "2026-11-02     Zebranie", "2026-01-01");
    expect(v.date).toBe("2026-11-02");
    expect(v.topic).toBe("Zebranie");
  });

  it.each([
    ["sama data bez tematu – brak daty z nazwy, temat to cała nazwa", "2026-11-02.md", "2026-11-02.md", "2026-01-01"],
    ["data i same spacje po niej – brak tematu z nazwy", "2026-11-02   ", "2026-11-02", "2026-01-01"],
    ["nazwa bez daty – cały tekst jest tematem", "  Spotkanie  ", "Spotkanie", "2026-01-01"],
  ])("%s", (_opis, fileName, topic, date) => {
    const v = reportValues("", fileName, "2026-01-01");
    expect(v.topic).toBe(topic);
    expect(v.date).toBe(date);
  });
});

describe("normalizacja folderu – końcowe ukośniki", () => {
  it("usuwa końcowe ukośniki i zachowuje podfoldery", () => {
    expect(normalizeFolder("Fundacje/Zapłon///")).toBe("Fundacje/Zapłon");
    expect(normalizeFolder("Fundacje/Zapłon")).toBe("Fundacje/Zapłon");
  });

  it("sam ukośnik lub same spacje to brak folderu", () => {
    expect(normalizeFolder("/")).toBeNull();
    expect(normalizeFolder("   //  ")).toBeNull();
  });
});
