// __tests__/lib/notes/folders.test.ts

import { describe, it, expect } from "vitest";
import { ALL_FOLDERS, folderCounts, folderOptions, matchesFolder, normalizeFolder } from "@/lib/notes/folders";

describe("normalizeFolder", () => {
  it.each([
    ["Fundacje/Zapłon", "Fundacje/Zapłon"],
    ["  Fundacje /  Zapłon  ", "Fundacje/Zapłon"],
    ["/Fundacje//Zapłon/", "Fundacje/Zapłon"],
    ["Fundacje\\Zapłon", "Fundacje/Zapłon"],
    ["   ", null],
    ["///", null],
    ["", null],
    [null, null],
    [undefined, null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeFolder(raw)).toBe(expected);
  });

  it("przycina do 200 znaków (ograniczenie bazy) bez końcowego ukośnika", () => {
    const long = normalizeFolder(`${"a".repeat(199)}/bbb`);
    expect(long).toHaveLength(199);
    expect(long?.endsWith("/")).toBe(false);
    expect(normalizeFolder("x".repeat(300))).toHaveLength(200);
  });
});

describe("folderOptions / matchesFolder / folderCounts", () => {
  const notes = [{ folder: "Fundacje/Zapłon" }, { folder: "Fundacje/FPMSK" }, { folder: "Dom" }, { folder: null }, {}];

  it("lista zawiera foldery nadrzędne, alfabetycznie", () => {
    expect(folderOptions(notes)).toEqual(["Dom", "Fundacje", "Fundacje/FPMSK", "Fundacje/Zapłon"]);
  });

  it("filtr: wszystkie, bez folderu, folder z podfolderami (ale nie o podobnej nazwie)", () => {
    expect(notes.filter((n) => matchesFolder(n, ALL_FOLDERS))).toHaveLength(5);
    expect(notes.filter((n) => matchesFolder(n, { kind: "none" }))).toHaveLength(2);
    expect(notes.filter((n) => matchesFolder(n, { kind: "folder", folder: "Fundacje" }))).toHaveLength(2);
    expect(notes.filter((n) => matchesFolder(n, { kind: "folder", folder: "Fundacje/Zapłon" }))).toHaveLength(1);
    expect(matchesFolder({ folder: "Fundacje2/x" }, { kind: "folder", folder: "Fundacje" })).toBe(false);
  });

  it("liczniki z podfolderami i osobno „bez folderu”", () => {
    const { none, byFolder } = folderCounts(notes);
    expect(none).toBe(2);
    expect(Object.fromEntries(byFolder)).toEqual({ Dom: 1, Fundacje: 2, "Fundacje/FPMSK": 1, "Fundacje/Zapłon": 1 });
  });
});
