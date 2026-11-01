// __tests__/lib/obsidian/markdown.test.ts

import { describe, it, expect } from "vitest";
import { parseFrontMatter, stringifyFrontMatter } from "@/lib/obsidian/frontMatter";
import {
  noteFromMarkdown,
  noteToMarkdown,
  personFromMarkdown,
  personToMarkdown,
  recipeFromMarkdown,
  recipeToMarkdown,
  reportFromMarkdown,
  reportToMarkdown,
  vaultIdentity,
} from "@/lib/obsidian/markdown";
import { folderFromNotePath, noteFolderPath, safeSegment, typeFromPath, vaultPath } from "@/lib/obsidian/paths";
import type { Note } from "@/types/notes";
import type { Recipe } from "@/types/recipes";
import type { Person } from "@/types/people";
import type { Report } from "@/types/reports";

describe("front matter", () => {
  it("zapis i odczyt (cudzysłowy, listy, znaki specjalne)", () => {
    const data = { title: 'Zebranie: „zarząd" #1', tags: ["a", "b"], n: 3, ok: true, none: null };
    expect(parseFrontMatter(`${stringifyFrontMatter(data)}\nTreść`)).toEqual({ data, body: "Treść" });
  });

  it("toleruje ręczne edycje w Obsidianie: wartości bez cudzysłowów i listy blokowe", () => {
    const text = "---\ntitle: Moja notatka\ntags:\n  - fundacja\n  - zarząd\n---\nTreść";
    expect(parseFrontMatter(text).data).toEqual({ title: "Moja notatka", tags: ["fundacja", "zarząd"] });
  });

  it("plik bez nagłówka: cała treść, pusty nagłówek", () => {
    expect(parseFrontMatter("Zwykły tekst")).toEqual({ data: {}, body: "Zwykły tekst" });
  });
});

describe("konwersja typów (zapis → odczyt)", () => {
  it("notatka z folderem i punktami", () => {
    const note = {
      id: "n1",
      title: "Lista",
      items: ["- mleko", "- **chleb**", "zwykła linia"],
      bg_color: "x",
      user_id: "u",
      folder: "Dom/Zakupy",
      updated_at: "2026-10-31T10:00:00Z",
    } as Note;
    const md = noteToMarkdown(note);
    expect(vaultIdentity(md)).toMatchObject({ id: "n1", type: "note" });
    expect(noteFromMarkdown(md, "x")).toEqual({ title: "Lista", items: note.items, folder: "Dom/Zakupy" });
  });

  it("notatka utworzona w Obsidianie (bez nagłówka): tytuł z nazwy pliku", () => {
    expect(noteFromMarkdown("linia 1\nlinia 2\n", "Pomysły")).toEqual({
      title: "Pomysły",
      items: ["linia 1", "linia 2"],
      folder: null,
    });
  });

  it("przepis: składniki i przygotowanie", () => {
    const recipe = {
      id: "r1",
      name: "Zupa",
      category: "obiad",
      products: ["marchew", "pietruszka"],
      description: "Gotować 30 min.\nDoprawić.",
      user_id: "u",
    } as unknown as Recipe;
    expect(recipeFromMarkdown(recipeToMarkdown(recipe), "x")).toEqual({
      name: "Zupa",
      category: "obiad",
      products: ["marchew", "pietruszka"],
      description: "Gotować 30 min.\nDoprawić.",
    });
  });

  it("osoba: dane kontaktowe w nagłówku, notatki w treści", () => {
    const person = {
      id: "p1",
      user_id: "u",
      first_name: "Anna",
      last_name: "Nowak",
      relationship: "współpraca",
      priority: 2,
      birthday: "1990-05-01",
      nameday: null,
      phones: ["+48 600 000 000"],
      emails: ["anna@x.pl"],
      notes: "Koordynatorka projektu.",
      last_contact_date: null,
    } as Person;
    expect(personFromMarkdown(personToMarkdown(person))).toMatchObject({
      first_name: "Anna",
      last_name: "Nowak",
      priority: 2,
      birthday: "1990-05-01",
      phones: ["+48 600 000 000"],
      emails: ["anna@x.pl"],
      notes: "Koordynatorka projektu.",
    });
  });

  it("protokół: porządek, zadania (z zachowaniem app_task_id) i notatki", () => {
    const report = {
      id: "rep1",
      user_id: "u",
      topic: "Zarząd",
      date: "2026-10-31",
      agenda: ["Budżet", "Wolontariat"],
      participants: ["Anna", "Jan"],
      tasks: [
        { zadanie: "Wniosek do NIW", osoba: "Anna", data: "2026-11-15", app_task_id: "t9" },
        { zadanie: "Ogłoszenie", osoba: "", data: "" },
      ],
      notes: "Ustalono harmonogram.",
    } as unknown as Report;
    const back = reportFromMarkdown(reportToMarkdown(report), report);
    expect(back).toMatchObject({
      topic: "Zarząd",
      date: "2026-10-31",
      participants: ["Anna", "Jan"],
      agenda: ["Budżet", "Wolontariat"],
      notes: "Ustalono harmonogram.",
    });
    expect(back.tasks).toEqual(report.tasks);
  });
});

describe("ścieżki vaultu", () => {
  it("bezpieczne nazwy i foldery notatek", () => {
    expect(safeSegment('Plan: "Q4" / zarząd?')).toBe("Plan- -Q4- - zarząd-");
    expect(safeSegment("   ")).toBe("bez nazwy");
    expect(noteFolderPath(" Fundacje / Zapłon ")).toBe("Fundacje/Zapłon");
    expect(vaultPath("note", "Lista", "Dom/Zakupy")).toBe("Notatki/Dom/Zakupy/Lista.md");
    expect(vaultPath("report", "2026-10-31 Zarząd")).toBe("Protokoły/2026-10-31 Zarząd.md");
  });

  it("typ i folder z ścieżki", () => {
    expect(typeFromPath("Przepisy/Zupa.md")).toBe("recipe");
    expect(typeFromPath("Inne/x.md")).toBeNull();
    expect(folderFromNotePath("Notatki/A/B/x.md")).toBe("A/B");
    expect(folderFromNotePath("Notatki/x.md")).toBeNull();
  });
});
