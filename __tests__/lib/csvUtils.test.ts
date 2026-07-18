import { describe, it, expect } from "vitest";
import { processCsvText } from "@/lib/csvUtils";
import type { BudgetCategory } from "@/types/bills";

const CSV_HEADER = `"#Data operacji";"#Opis operacji";"#Kategoria";"#Kwota"`;

const buildCsv = (rows: string[]) => [CSV_HEADER, ...rows].join("\n");

const noCategories: BudgetCategory[] = [];

describe("processCsvText", () => {
  it("returns an error when the mBank/PKO header is missing", () => {
    const result = processCsvText("just;some;random;csv", [], noCategories);
    expect(result.error).toMatch(/Nieprawidłowy format pliku/);
  });

  it("parses a known merchant into a friendly name and the matching budget category", () => {
    const csv = buildCsv([
      `"2024-03-15";"ZAKUP PRZY UŻYCIU KARTY W KRAJU BIEDRONKA 123 WARSZAWA";"Supermarkety";"-25,50 PLN"`,
    ]);
    const result = processCsvText(csv, [], noCategories);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions?.[0]).toMatchObject({
      date: "2024-03-15",
      description: "Biedronka",
      amount: 25.5,
      mappedCategory: "Jedzenie",
    });
  });

  it("excludes only ATM cash withdrawals/deposits, not regular bank transfers", () => {
    const csv = buildCsv([
      `"2024-03-16";"PRZELEW NA RACHUNEK ZUS";"Przelewy";"-500,00 PLN"`,
      `"2024-03-16";"WYPLATA W BANKOMACIE";"Bankomaty";"-200,00 PLN"`,
    ]);
    const result = processCsvText(csv, [], noCategories);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions?.[0].description).toMatch(/ZUS/i);
  });

  it("includes positive amounts as income rather than dropping them", () => {
    const csv = buildCsv([
      `"2024-03-17";"WYNAGRODZENIE MARZEC";"Wpływy";"5000,00 PLN"`,
    ]);
    const result = processCsvText(csv, [], noCategories);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions?.[0].is_income).toBe(true);
  });

  it("maps a subscription merchant to Rozrywka via the category column", () => {
    const csv = buildCsv([
      `"2024-03-18";"NETFLIX.COM 4491";"Rozrywka";"-55,00 PLN"`,
    ]);
    const result = processCsvText(csv, [], noCategories);
    expect(result.transactions?.[0]).toMatchObject({
      description: "Netflix",
      mappedCategory: "Rozrywka",
    });
  });

  it("skips a transaction already present in expenseItems (duplicate import guard)", () => {
    const csv = buildCsv([
      `"2024-03-15";"ZAKUP PRZY UŻYCIU KARTY W KRAJU BIEDRONKA 123 WARSZAWA";"Supermarkety";"-25,50 PLN"`,
    ]);
    const existing = [{ amount: 25.5, date: "2024-03-15", description: "Biedronka", is_income: false }];
    const result = processCsvText(csv, existing, noCategories);

    expect(result.transactions).toHaveLength(0);
    expect(result.dupes).toBe(1);
    expect(result.info).toMatch(/już zaimportowane/);
  });

  it("detects a duplicate income transaction against existing income bills", () => {
    const csv = buildCsv([
      `"2026-06-27";"PRZELEW PRZYCHODZĄCY WYNAGRODZENIE";"Wpływy";"5000,00 PLN"`,
    ]);
    const existing = [{ amount: 5000, date: "2026-06-27", description: "PRZELEW PRZYCHODZĄCY WYNAGRODZENIE", is_income: true }];
    const result = processCsvText(csv, existing, noCategories);

    expect(result.transactions).toHaveLength(0);
    expect(result.dupes).toBe(1);
  });

  it("does not treat an expense and an income with the same amount/date/description as duplicates of each other", () => {
    const csv = buildCsv([
      `"2026-06-27";"ZWROT";"Inne";"-100,00 PLN"`,
    ]);
    const existing = [{ amount: 100, date: "2026-06-27", description: "ZWROT", is_income: true }];
    const result = processCsvText(csv, existing, noCategories);

    expect(result.dupes).toBe(0);
    expect(result.transactions).toHaveLength(1);
  });

  it("reports missing required categories that the user has not created yet", () => {
    const csv = buildCsv([
      `"2024-03-18";"NETFLIX.COM 4491";"Rozrywka";"-55,00 PLN"`,
    ]);
    const result = processCsvText(csv, [], noCategories);
    expect(result.missingCategories).toContain("Rozrywka");
  });

  it("does not flag a required category that already exists", () => {
    const csv = buildCsv([
      `"2024-03-18";"NETFLIX.COM 4491";"Rozrywka";"-55,00 PLN"`,
    ]);
    const categories: BudgetCategory[] = [{ id: "c1", name: "Rozrywka", user_id: "u1" } as BudgetCategory];
    const result = processCsvText(csv, [], categories);
    expect(result.missingCategories).not.toContain("Rozrywka");
  });

  it("accepts amounts with a non-breaking space as the thousands separator", () => {
    const csv = buildCsv([
      `"2024-03-19";"RTV EURO AGD";"Elektronika";"-1\u00A0299,99 PLN"`,
    ]);
    const result = processCsvText(csv, [], noCategories);
    expect(result.transactions?.[0].amount).toBeCloseTo(1299.99);
  });
});
