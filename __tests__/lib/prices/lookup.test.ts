// __tests__/lib/prices/lookup.test.ts

import { describe, it, expect } from "vitest";
import { lookupPrice, suggestionNames } from "@/lib/prices/lookup";
import { nameKey } from "@/lib/prices/text";
import type { ProductPrice } from "@/types/prices";

const entry = (name: string, avg: number): ProductPrice => ({
  id: name,
  user_id: "u",
  name,
  name_key: nameKey(name),
  unit: "kg",
  avg_price: avg,
  occurrences: 1,
});

const prices = [entry("Pomidory", 12.99), entry("Pomidory malinowe", 14.99), entry("Ser", 30)];

describe("lookupPrice", () => {
  it("dokładna nazwa, bez względu na wielkość liter i polskie znaki", () => {
    expect(lookupPrice([entry("Łosoś", 50)], "łosos")?.avg_price).toBe(50);
  });

  it("najdłuższa pasująca nazwa, gdy tekst zawiera dodatkowe słowa", () => {
    expect(lookupPrice(prices, "pomidory malinowe 1 kg")?.name).toBe("Pomidory malinowe");
    expect(lookupPrice(prices, "pomidory 2 kg")?.name).toBe("Pomidory");
  });

  it("brak dopasowania to undefined", () => {
    expect(lookupPrice(prices, "chleb")).toBeUndefined();
    expect(lookupPrice(prices, "   ")).toBeUndefined();
  });
});

describe("suggestionNames", () => {
  it("łączy przepisy z katalogiem bez duplikatów i sortuje po polsku", () => {
    expect(suggestionNames(prices, ["pomidory", "Żurek", "Cebula"])).toEqual([
      "Cebula",
      "Pomidory",
      "Pomidory malinowe",
      "Ser",
      "Żurek",
    ]);
  });
});
