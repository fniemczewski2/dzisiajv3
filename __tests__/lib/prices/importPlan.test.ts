// __tests__/lib/prices/importPlan.test.ts

import { describe, it, expect } from "vitest";
import {
  buildChanges,
  buildCsvRows,
  buildReceiptRows,
  priceForUnit,
  rowNeedsDecision,
  suggestProductName,
  type CatalogContext,
  type ReviewRow,
} from "@/lib/prices/importPlan";
import { nameKey } from "@/lib/prices/text";
import type { ParsedReceipt, ProductPrice } from "@/types/prices";

const entry = (name: string, unit: ProductPrice["unit"], avg: number, occurrences = 3): ProductPrice => ({
  id: name,
  user_id: "u1",
  name,
  name_key: nameKey(name),
  unit,
  avg_price: avg,
  occurrences,
});

const context = (catalog: ProductPrice[] = [], recipeProducts: string[] = []): CatalogContext => ({
  catalog,
  aliases: [],
  recipeProducts,
});

const receipt = (items: Partial<ParsedReceipt["items"][number]>[]): ParsedReceipt => ({
  store: "lidl",
  date: "2026-10-19",
  total: null,
  totalMismatch: true,
  itemsSum: 0,
  items: items.map((item) => ({
    rawName: "Produkt",
    displayName: "Produkt",
    quantity: 1,
    weighed: false,
    unitPrice: 5,
    lineValue: 5,
    discount: 0,
    netValue: 5,
    issues: [],
    ...item,
  })),
});

describe("priceForUnit", () => {
  it("pozycja ważona: cena za kg po rabacie", () => {
    const source = { quantity: 0.5, weighed: true, netValue: 3, packSize: null };
    expect(priceForUnit(source, "kg")).toBe(6);
    expect(priceForUnit(source, "szt.")).toBeNull();
  });

  it("sztuki z gramaturą w nazwie przeliczają się na kg i litry", () => {
    expect(
      priceForUnit({ quantity: 1, weighed: false, netValue: 5.99, packSize: { amount: 0.5, unit: "kg" } }, "kg")
    ).toBe(11.98);
    expect(
      priceForUnit({ quantity: 2, weighed: false, netValue: 4, packSize: { amount: 1, unit: "litr" } }, "litr")
    ).toBe(2);
  });

  it("bez gramatury nie da się policzyć ceny za kg", () => {
    expect(priceForUnit({ quantity: 1, weighed: false, netValue: 5, packSize: null }, "kg")).toBeNull();
  });

  it("cena za sztukę i opakowanie to wartość po rabacie na sztukę (Gouda 2 × 9,99, −10 zł)", () => {
    const source = { quantity: 2, weighed: false, netValue: 9.98, packSize: null };
    expect(priceForUnit(source, "szt.")).toBe(4.99);
    expect(priceForUnit(source, "opak.")).toBe(4.99);
  });
});

describe("buildReceiptRows: jednostka", () => {
  it("jednostka istniejącego produktu ma pierwszeństwo", () => {
    const rows = buildReceiptRows(
      receipt([{ displayName: "Awokado", rawName: "Awokado" }]),
      context([entry("Awokado", "szt.", 6.99)])
    );
    expect(rows[0]).toMatchObject({ name: "Awokado", unit: "szt.", price: 5, flags: [] });
  });

  it("nowy produkt na wagę dostaje kg z paragonu", () => {
    const rows = buildReceiptRows(
      receipt([{ displayName: "Marchew luz", weighed: true, quantity: 0.374, netValue: 1.49 }]),
      context()
    );
    expect(rows[0]).toMatchObject({ unit: "kg", price: 3.98 });
  });

  it("nowy produkt na sztuki zostawia jednostkę pustą do decyzji i oznacza wiersz", () => {
    const rows = buildReceiptRows(receipt([{ displayName: "Ser Pecorino tarty" }]), context());
    expect(rows[0].unit).toBeNull();
    expect(rows[0].flags).toContain("Wybierz jednostkę.");
  });

  it("istniejący produkt na kg, a paragon bez wagi i gramatury: cena do ręcznego wpisu", () => {
    const rows = buildReceiptRows(receipt([{ displayName: "Papryka" }]), context([entry("Papryka", "kg", 14.99)]));
    expect(rows[0].price).toBeNull();
    expect(rows[0].flags.join(" ")).toContain("nie da się ustalić ceny za kg");
  });

  it("istniejący produkt na kg i gramatura w nazwie: cena przeliczona do weryfikacji", () => {
    const rows = buildReceiptRows(
      receipt([{ displayName: "Brokuły 500g", rawName: "Brokuly 500g", netValue: 5.99 }]),
      context([entry("Brokuły", "kg", 9.24)])
    );
    expect(rows[0]).toMatchObject({ name: "Brokuły", unit: "kg", price: 11.98 });
  });
});

describe("suggestProductName", () => {
  it("zapamiętany alias wygrywa z dopasowaniem po nazwie", () => {
    const ctx: CatalogContext = {
      catalog: [entry("Pomidory", "kg", 12.99), entry("Pomidory malinowe", "kg", 14)],
      aliases: [
        {
          id: "1",
          user_id: "u1",
          store: "lidl",
          alias_key: nameKey("Pomidory malin.PL500"),
          product_name_key: nameKey("Pomidory"),
        },
      ],
      recipeProducts: [],
    };
    expect(suggestProductName("lidl", "Pomidory malin.PL500", "Pomidory malin.PL 500", ctx).name).toBe("Pomidory");
  });

  it("dopasowuje po słowach produktu, ignorując polskie znaki, i wybiera najdłuższą nazwę", () => {
    const ctx = context([entry("Śmietanka", "opak.", 5.49), entry("Śmietanka 30%", "opak.", 5.49)]);
    expect(suggestProductName("lidl", "Smietanka 30% 330g", "Smietanka 30% 330g", ctx).name).toBe("Śmietanka 30%");
  });

  it("podpowiada nazwę z przepisu, gdy nie ma jej w katalogu", () => {
    const ctx = context([], ["Cebula żółta"]);
    const result = suggestProductName("lidl", "Cebula zotta luz", "Cebula zolta luz", ctx);
    expect(result).toEqual({ name: "Cebula żółta", existing: undefined });
  });

  it("bez dopasowania zostawia oczyszczoną nazwę z paragonu", () => {
    expect(suggestProductName("biedronka", "RęczQuMegSweep120", "Ręcz Qu Meg Sweep 120", context()).name).toBe(
      "Ręcz Qu Meg Sweep 120"
    );
  });
});

describe("buildCsvRows", () => {
  it("jednostka istniejącego produktu ma pierwszeństwo, a niezgodna jednostka z pliku wyłącza wiersz", () => {
    const ctx = context([entry("Banany", "kg", 6.99)]);
    const rows = buildCsvRows(
      [
        { name: "Banany", unit: "szt.", price: 1.2 },
        { name: "Mleko", unit: "litr", price: 2.99 },
      ],
      ctx
    );
    expect(rows[0]).toMatchObject({ unit: "kg", include: false });
    expect(rows[0].flags[0]).toContain("Plik podaje szt.");
    expect(rows[1]).toMatchObject({ unit: "litr", include: true, flags: [] });
  });
});

const row = (overrides: Partial<ReviewRow>): ReviewRow => ({
  id: "r",
  include: true,
  store: "lidl",
  rawName: "Surowa",
  name: "Mleko",
  unit: "litr",
  price: 3,
  priceEdited: false,
  decision: "keep",
  flags: [],
  source: null,
  ...overrides,
});

describe("buildChanges", () => {
  const catalog = [entry("Mleko", "litr", 3, 4)];

  it("zmiana do 20%: średnia ważona i zapamiętany alias nazwy z paragonu", () => {
    const { upserts, aliases } = buildChanges([row({ price: 3.3 })], catalog);
    expect(upserts).toEqual([{ name: "Mleko", name_key: "mleko", unit: "litr", avg_price: 3.06, occurrences: 5 }]);
    expect(aliases).toEqual([{ store: "lidl", alias_key: "surowa", product_name_key: "mleko" }]);
  });

  it("zmiana powyżej 20%: domyślnie katalog się nie zmienia (decyzja „nie aktualizuj”)", () => {
    const changed = row({ price: 6 });
    expect(rowNeedsDecision(changed, catalog)).toBe(true);
    expect(buildChanges([changed], catalog).upserts[0]).toMatchObject({ avg_price: 3, occurrences: 4 });
  });

  it("decyzja „nadpisz” i „uśrednij” przy zmianie powyżej 20%", () => {
    expect(buildChanges([row({ price: 6, decision: "overwrite" })], catalog).upserts[0]).toMatchObject({
      avg_price: 6,
      occurrences: 1,
    });
    expect(buildChanges([row({ price: 6, decision: "average" })], catalog).upserts[0]).toMatchObject({
      avg_price: 3.6,
      occurrences: 5,
    });
  });

  it("dwa wiersze tego samego produktu z jednego paragonu to dwa wystąpienia", () => {
    const { upserts } = buildChanges([row({ price: 3 }), row({ price: 3 })], catalog);
    expect(upserts).toEqual([{ name: "Mleko", name_key: "mleko", unit: "litr", avg_price: 3, occurrences: 6 }]);
  });

  it("nowy produkt trafia do katalogu z jednostką z wiersza", () => {
    const { upserts } = buildChanges([row({ name: "Jogurt", unit: "szt.", price: 1.5, rawName: "" })], []);
    expect(upserts).toEqual([{ name: "Jogurt", name_key: "jogurt", unit: "szt.", avg_price: 1.5, occurrences: 1 }]);
  });

  it("zmiana jednostki istniejącego produktu zaczyna statystykę od nowa", () => {
    const { upserts } = buildChanges([row({ unit: "opak.", price: 4 })], catalog);
    expect(upserts[0]).toMatchObject({ unit: "opak.", avg_price: 4, occurrences: 1 });
  });

  it("pomija wiersze odznaczone i niekompletne (brak ceny lub jednostki)", () => {
    const result = buildChanges(
      [row({ include: false }), row({ price: null }), row({ unit: null, name: "Nowy" })],
      catalog
    );
    expect(result.upserts).toEqual([]);
    expect(result.skipped).toBe(2);
  });
});
