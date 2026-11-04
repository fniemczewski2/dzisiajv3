// __tests__/lib/obsidian/importItems.test.ts
//
// Wartości wstawiane z nowych plików Obsidiana: uzupełnianie z nazwy pliku i bezpieczne wartości domyślne.

import { describe, it, expect } from "vitest";
import { importValues, personValues, recipeValues, reportValues } from "@/lib/obsidian/importItems";

describe("recipeValues", () => {
  it("nazwa z nazwy pliku, nieznana kategoria → „danie główne”, produkty z listy", () => {
    expect(recipeValues("## Składniki\n- mąka\n- jajka\n", "Placki")).toMatchObject({
      name: "Placki",
      category: "danie główne",
      products: ["mąka", "jajka"],
    });
  });

  it("kategoria z nagłówka pliku (dozwolona) zostaje", () => {
    expect(recipeValues('---\ncategory: "zupa"\n---\n## Składniki\n- woda\n', "Rosół")).toMatchObject({
      category: "zupa",
    });
    expect(recipeValues('---\ncategory: "kanapka"\n---\n', "X")).toMatchObject({ category: "danie główne" });
  });
});

describe("personValues", () => {
  it("imię i nazwisko z nazwy pliku, gdy brak w nagłówku", () => {
    expect(personValues("uwagi\n", "Jan Kowalski")).toMatchObject({
      first_name: "Jan",
      last_name: "Kowalski",
      notes: "uwagi",
    });
    expect(personValues("", "Madonna")).toMatchObject({ first_name: "Madonna", last_name: "" });
  });

  it("nagłówek ma pierwszeństwo; priorytet ograniczony do 0–5; niepoprawne daty → null", () => {
    const values = personValues(
      '---\nfirst_name: "Anna"\nlast_name: "Nowak"\npriority: 9\nbirthday: "31-12-1990"\nnameday: 2026-13-45\n---\n',
      "Inna Nazwa"
    );
    expect(values).toMatchObject({
      first_name: "Anna",
      last_name: "Nowak",
      priority: 5,
      birthday: null,
      nameday: null,
    });
  });

  it("poprawna data urodzin przechodzi, pusty plik daje imię zastępcze", () => {
    expect(personValues("---\nbirthday: 1990-05-17\n---\n", "Jan")).toMatchObject({ birthday: "1990-05-17" });
    expect(personValues("", "")).toMatchObject({ first_name: "Bez imienia" });
  });
});

describe("reportValues", () => {
  it("data i temat z nazwy pliku „RRRR-MM-DD Temat”, gdy brak w nagłówku; zadania z sekcji", () => {
    const values = reportValues(
      "## Zadania\n- [ ] Zrobić X — Anna — 2026-11-10\n",
      "2026-11-01 Zebranie zarządu",
      "2026-11-03"
    );
    expect(values).toMatchObject({ topic: "Zebranie zarządu", date: "2026-11-01" });
    expect(values.tasks).toEqual([{ zadanie: "Zrobić X", osoba: "Anna", data: "2026-11-10" }]);
  });

  it("brak daty (albo niepoprawna) → dzisiejsza; brak tematu → nazwa pliku", () => {
    expect(reportValues("", "Luźne notatki", "2026-11-03")).toMatchObject({
      topic: "Luźne notatki",
      date: "2026-11-03",
    });
    expect(reportValues('---\ndate: "jutro"\ntopic: "T"\n---\n', "x", "2026-11-03")).toMatchObject({
      topic: "T",
      date: "2026-11-03",
    });
  });

  it("nagłówek ma pierwszeństwo przed nazwą pliku", () => {
    expect(
      reportValues('---\ndate: "2026-10-01"\ntopic: "Z nagłówka"\n---\n', "2026-11-01 Inna", "2026-11-03")
    ).toMatchObject({
      topic: "Z nagłówka",
      date: "2026-10-01",
    });
  });
});

describe("importValues", () => {
  it("wybiera funkcję według typu", () => {
    expect(importValues("recipe", "", "A", "2026-11-03")).toHaveProperty("category");
    expect(importValues("person", "", "A B", "2026-11-03")).toHaveProperty("first_name", "A");
    expect(importValues("report", "", "A", "2026-11-03")).toHaveProperty("date", "2026-11-03");
  });
});
