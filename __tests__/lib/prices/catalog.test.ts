// __tests__/lib/prices/catalog.test.ts

import { describe, it, expect } from "vitest";
import { mergePrice, needsDecision, relativeChange } from "@/lib/prices/catalog";

const existing = { avg_price: 10, occurrences: 4 };

describe("mergePrice", () => {
  it("nowy produkt: cena i liczba wystąpień z obserwacji", () => {
    expect(mergePrice(undefined, { price: 5.99 })).toEqual({ avg_price: 5.99, occurrences: 1 });
  });

  it("zmiana do 20%: średnia ważona liczbą wystąpień", () => {
    expect(mergePrice(existing, { price: 11 })).toEqual({ avg_price: 10.2, occurrences: 5 });
  });

  it("zmiana dokładnie 20% nie wymaga decyzji", () => {
    expect(needsDecision(existing, 12)).toBe(false);
    expect(needsDecision(existing, 12.01)).toBe(true);
  });

  it("zmiana powyżej 20%: domyślnie nie aktualizuje", () => {
    expect(mergePrice(existing, { price: 20 })).toEqual(existing);
    expect(mergePrice(existing, { price: 20 }, "keep")).toEqual(existing);
  });

  it("zmiana powyżej 20% i decyzja „nadpisz”: nowa cena, licznik od nowa", () => {
    expect(mergePrice(existing, { price: 20 }, "overwrite")).toEqual({ avg_price: 20, occurrences: 1 });
  });

  it("zmiana powyżej 20% i decyzja „uśrednij”: średnia ważona", () => {
    expect(mergePrice(existing, { price: 20 }, "average")).toEqual({ avg_price: 12, occurrences: 5 });
  });

  it("decyzja nie zmienia wyniku przy zmianie do 20%", () => {
    expect(mergePrice(existing, { price: 11 }, "keep")).toEqual({ avg_price: 10.2, occurrences: 5 });
  });

  it("liczy wiele wystąpień naraz", () => {
    expect(mergePrice(existing, { price: 10, count: 2 })).toEqual({ avg_price: 10, occurrences: 6 });
  });
});

describe("relativeChange", () => {
  it("różnica względem średniej", () => {
    expect(relativeChange(10, 12.5)).toBeCloseTo(0.25);
    expect(relativeChange(0, 5)).toBe(1);
  });
});
