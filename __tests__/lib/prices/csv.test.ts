// __tests__/lib/prices/csv.test.ts

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parsePriceCsv, splitCsv } from "@/lib/prices/csv";

describe("splitCsv", () => {
  it("obsługuje cudzysłowy, przecinki w polach, CRLF i BOM", () => {
    expect(splitCsv('\uFEFFa,"b,c","d ""e"""\r\nx,y,z\r\n')).toEqual([
      ["a", "b,c", 'd "e"'],
      ["x", "y", "z"],
    ]);
  });
});

describe("parsePriceCsv: plik z przykładu", () => {
  const result = parsePriceCsv(readFileSync("__tests__/fixtures/ceny-produktow.csv", "utf8"));

  it("pomija nagłówek i wczytuje produkty z jednostką i ceną w zł", () => {
    expect(result.rows[0]).toEqual({ name: "Ananas", unit: "kg", price: 7.99 });
    expect(result.rows.find((r) => r.name === "Awokado")).toEqual({ name: "Awokado", unit: "szt.", price: 6.99 });
  });

  it("ujednolica „opak” do „opak.”, a cenę bez „zł” też czyta", () => {
    expect(result.rows.find((r) => r.name === "Wafle ryżowe")).toMatchObject({ unit: "opak.", price: 3.49 });
    expect(result.rows.find((r) => r.name === "Ketchup")).toMatchObject({ unit: "kg", price: 14.33 });
    expect(result.rows.find((r) => r.name === "Ocet")).toMatchObject({ unit: "litr", price: 3.58 });
  });

  it("każda jednostka jest ze zbioru dozwolonych albo pusta", () => {
    for (const row of result.rows) expect([null, "kg", "litr", "szt.", "opak.", "m"]).toContain(row.unit);
  });

  it("wczytuje wszystkie 211 produktów z przykładu (puste wiersze są ignorowane)", () => {
    expect(result.rows).toHaveLength(211);
    expect(result.skipped).toEqual([]);
  });
});

describe("parsePriceCsv: przypadki brzegowe", () => {
  it("pusta jednostka zostaje do decyzji użytkownika, brak nazwy jest pomijany", () => {
    const result = parsePriceCsv('Chleb,,"4,50zł"\n,kg,"1,00zł"\n');
    expect(result.rows).toEqual([{ name: "Chleb", unit: null, price: 4.5 }]);
    expect(result.withoutUnit).toBe(1);
    expect(result.skipped.map((s) => s.reason)).toEqual(["brak nazwy produktu"]);
  });

  it("odrzuca nieprawidłową cenę i duplikaty", () => {
    const result = parsePriceCsv('Nazwa,j.m.,Cena\nMleko,litr,"2,99zł"\nmleko,litr,"3,10zł"\nChleb,szt.,abc\n');
    expect(result.rows).toEqual([{ name: "Mleko", unit: "litr", price: 2.99 }]);
    expect(result.skipped.map((s) => s.reason)).toEqual(["duplikat produktu „mleko”", "nieprawidłowa cena „abc”"]);
  });
});
