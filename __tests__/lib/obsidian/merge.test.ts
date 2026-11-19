// __tests__/lib/obsidian/merge.test.ts

import { describe, it, expect } from "vitest";
import { isIgnoredFile, mergeIntoExisting } from "@/lib/obsidian/merge";
import { parseFrontMatter } from "@/lib/obsidian/frontMatter";

const APP = '---\ndzisiaj_id: "r1"\nname: "Zupa"\ntags: ["zupa"]\nupdated: "2026-01-01T00:00:00+00:00"\n---\nTreść\n';

describe("mergeIntoExisting", () => {
  it("bez istniejącego pliku – wersja z aplikacji", () => {
    expect(mergeIntoExisting(APP, null)).toBe(APP);
  });

  it("zachowuje pola z Obsidiana, sumuje tagi, bierze późniejsze updated, treść z aplikacji", () => {
    const existing =
      '---\naliases:\n  - Rosół\ntags:\n  - Przepis\nname: Stara\nupdated: 2026-11-19T20:30:00\ndzisiaj_links: ["x"]\n---\nStara treść\n';
    const { data, body } = parseFrontMatter(mergeIntoExisting(APP, existing));
    expect(data).toMatchObject({
      dzisiaj_id: "r1",
      name: "Zupa",
      aliases: ["Rosół"],
      tags: ["Przepis", "zupa"],
      updated: "2026-11-19T20:30:00",
    });
    expect(data).not.toHaveProperty("dzisiaj_links");
    expect(body).toBe("Treść\n");
  });

  it("jest idempotentne", () => {
    const existing = "---\nauthor:\n  - F.Niemczewski\n---\nx\n";
    const once = mergeIntoExisting(APP, existing);
    expect(mergeIntoExisting(APP, once)).toBe(once);
  });
});

describe("isIgnoredFile", () => {
  it("dzisiaj_ignore: true", () => {
    expect(isIgnoredFile("---\ndzisiaj_ignore: true\n---\n")).toBe(true);
    expect(isIgnoredFile("---\ndzisiaj_ignore: false\n---\n")).toBe(false);
    expect(isIgnoredFile("bez nagłówka")).toBe(false);
  });
});
