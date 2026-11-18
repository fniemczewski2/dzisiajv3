// __tests__/lib/prices/text.test.ts

import { describe, it, expect } from "vitest";
import { formatUnitPrice, nameKey, normalizeUnit, packSizeFromName, parsePrice } from "@/lib/prices/text";

describe("nameKey", () => {
  it("ignoruje wielkość liter, polskie znaki i interpunkcję", () => {
    expect(nameKey("Śmietanka 30% 330g")).toBe("smietanka 30 330g");
    expect(nameKey("  Łosoś   wędzony ")).toBe("losos wedzony");
    expect(nameKey("Smietanka 30% 330g")).toBe(nameKey("ŚMIETANKA 30% 330G"));
  });
});

describe("normalizeUnit", () => {
  it.each([
    ["opak", "opak."],
    ["opak.", "opak."],
    ["szt", "szt."],
    ["szt.", "szt."],
    ["KG", "kg"],
    ["l", "litr"],
    ["litr", "litr"],
    ["m", "m"],
  ])("%s → %s", (input, expected) => expect(normalizeUnit(input)).toBe(expected));

  it("pusta lub nieznana jednostka to null", () => {
    expect(normalizeUnit("")).toBeNull();
    expect(normalizeUnit("garść")).toBeNull();
    expect(normalizeUnit(undefined)).toBeNull();
  });
});

describe("parsePrice", () => {
  it.each([
    ["7,99zł", 7.99],
    ["7.99 zł", 7.99],
    ["1 234,50", 1234.5],
    ["6,39", 6.39],
    [12, 12],
  ])("%s → %s", (input, expected) => expect(parsePrice(input)).toBe(expected));

  it("odrzuca wartości nieliczbowe i ujemne", () => {
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("-3,00")).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice(-1)).toBeNull();
  });
});

describe("packSizeFromName", () => {
  it.each([
    ["Brokuły 500g", { amount: 0.5, unit: "kg" }],
    ["Mąka 1kg", { amount: 1, unit: "kg" }],
    ["Napój 0,5l", { amount: 0.5, unit: "litr" }],
    ["Passata pomid.720ml", { amount: 0.72, unit: "litr" }],
  ])("%s", (name, expected) => expect(packSizeFromName(name)).toEqual(expected));

  it("brak gramatury to null", () => {
    expect(packSizeFromName("Ser gouda")).toBeNull();
  });
});

describe("formatUnitPrice", () => {
  it("cena za jednostkę w złotych", () => {
    expect(formatUnitPrice(5.99, "kg")).toBe("5,99 zł / kg");
    expect(formatUnitPrice(5.9, null)).toBe("5,90 zł");
  });
});
