// __tests__/lib/notes/export.test.ts

import { describe, it, expect } from "vitest";
import { allNotesMarkdown, noteMarkdownFile } from "@/lib/notes/export";
import type { Note } from "@/types/notes";

const note = (over: Partial<Note> = {}): Note => ({
  id: "7",
  title: "Zebranie: plan/budżet",
  items: ["- punkt 1", "- punkt 2"],
  bg_color: "yellow",
  user_id: "u1",
  folder: "Fundacje/Zapłon",
  updated_at: "2026-11-02T10:00:00Z",
  ...over,
});

describe("noteMarkdownFile", () => {
  it("nazwa pliku bez znaków niedozwolonych; treść z nagłówkiem YAML i linijkami notatki", () => {
    const file = noteMarkdownFile(note());
    expect(file.fileName).toBe("Zebranie_ plan_budżet.md");
    expect(file.content.startsWith("---\n")).toBe(true);
    expect(file.content).toContain("- punkt 1");
    expect(file.content).toContain("Fundacje/Zapłon");
  });

  it("pusty tytuł: nazwa domyślna", () => {
    expect(noteMarkdownFile(note({ title: "" })).fileName).toBe("notatka.md");
  });
});

describe("allNotesMarkdown", () => {
  it("jeden plik: nagłówek z datą, sekcje z folderem i treścią, rozdzielone linią", () => {
    const file = allNotesMarkdown(
      [note(), note({ id: "8", title: "Zakupy", folder: null, items: ["mleko"], archived: true })],
      "2026-11-03"
    );
    expect(file.fileName).toBe("notatki-2026-11-03.md");
    expect(file.content.startsWith("# Notatki (2026-11-03)\n")).toBe(true);
    expect(file.content).toContain("## Zebranie: plan/budżet\nFolder: Fundacje/Zapłon\n\n- punkt 1\n- punkt 2");
    expect(file.content).toContain("## Zakupy\nZarchiwizowana\n\nmleko");
    expect(file.content.split("\n\n---\n\n")).toHaveLength(2);
  });

  it("notatka bez folderu i bez archiwizacji nie ma linii z metadanymi", () => {
    const file = allNotesMarkdown([note({ folder: null, items: ["a"] })], "2026-11-03");
    expect(file.content).toContain("## Zebranie: plan/budżet\n\na");
  });
});
