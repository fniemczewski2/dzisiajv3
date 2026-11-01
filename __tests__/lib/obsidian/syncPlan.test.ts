// __tests__/lib/obsidian/syncPlan.test.ts

import { describe, it, expect } from "vitest";
import { contentHash, planSync, type AppEntry, type RemoteFile, type SyncStateRow } from "@/lib/obsidian/syncPlan";

const TODAY = "2026-10-31";
const md = (id: string, body: string) => `---\ndzisiaj_id: "${id}"\ndzisiaj_type: "note"\n---\n\n${body}\n`;
const app = (id: string, body: string): AppEntry => ({
  id,
  type: "note",
  path: `Notatki/${id}.md`,
  markdown: md(id, body),
});
const file = (id: string | null, body: string, path = `Notatki/${id ?? "nowa"}.md`): RemoteFile => ({
  fileId: `f-${id ?? path}`,
  path,
  content: id ? md(id, body) : body,
});
const synced = (id: string, appBody: string, remoteBody = appBody): SyncStateRow => ({
  itemId: id,
  fileId: `f-${id}`,
  appHash: contentHash(md(id, appBody)),
  remoteHash: contentHash(md(id, remoteBody)),
});

describe("planSync", () => {
  it("nowy wpis w aplikacji → wysłanie pliku", () => {
    expect(planSync([app("a", "x")], [], [], TODAY)).toEqual([
      { kind: "upload", itemId: "a", path: "Notatki/a.md", markdown: md("a", "x"), fileId: null },
    ]);
  });

  it("bez zmian po żadnej stronie → brak działań (także przy innych końcach linii)", () => {
    const f = { ...file("a", "x"), content: md("a", "x").replaceAll("\n", "\r\n") };
    expect(planSync([app("a", "x")], [f], [synced("a", "x")], TODAY)).toEqual([]);
  });

  it("zmiana tylko w aplikacji → nadpisanie pliku w jego bieżącej ścieżce (po zmianie nazwy w Obsidianie)", () => {
    const f = file("a", "x", "Notatki/Nowa nazwa.md");
    const [action] = planSync([app("a", "y")], [f], [synced("a", "x")], TODAY);
    expect(action).toMatchObject({ kind: "upload", path: "Notatki/Nowa nazwa.md", fileId: "f-a" });
  });

  it("zmiana tylko w vaulcie → aktualizacja w aplikacji", () => {
    const [action] = planSync([app("a", "x")], [file("a", "z")], [synced("a", "x")], TODAY);
    expect(action).toMatchObject({ kind: "updateApp", itemId: "a" });
  });

  it("zmiana po obu stronach → konflikt: plik dostaje wersję aplikacji, wersja z vaultu jako kopia bez dzisiaj_id", () => {
    const [action] = planSync([app("a", "app")], [file("a", "vault")], [synced("a", "x")], TODAY);
    expect(action).toMatchObject({ kind: "conflict", conflictPath: "Notatki/a (konflikt 2026-10-31).md" });
    if (action.kind !== "conflict") throw new Error("oczekiwano konfliktu");
    expect(action.conflictContent).toContain('dzisiaj_conflict_of: "a"');
    expect(action.conflictContent).not.toContain("dzisiaj_id");
  });

  it("pierwsze połączenie: ta sama treść → tylko powiązanie; różna → konflikt", () => {
    expect(planSync([app("a", "x")], [file("a", "x")], [], TODAY)).toEqual([
      { kind: "link", itemId: "a", fileId: "f-a" },
    ]);
    expect(planSync([app("a", "x")], [file("a", "y")], [], TODAY)[0].kind).toBe("conflict");
  });

  it("plik utworzony w Obsidianie (bez nagłówka) w znanym folderze → import; poza folderami → pominięty", () => {
    const actions = planSync([], [file(null, "treść", "Przepisy/Placki.md"), file(null, "x", "Inne/x.md")], [], TODAY);
    expect(actions).toEqual([
      { kind: "import", type: "recipe", file: expect.objectContaining({ path: "Przepisy/Placki.md" }) },
    ]);
  });

  it("kopie konfliktów nie są importowane; usunięcia nie są przenoszone", () => {
    const copy: RemoteFile = {
      fileId: "c",
      path: "Notatki/a (konflikt).md",
      content: '---\ndzisiaj_conflict_of: "a"\n---\nx',
    };
    const orphan = file("usunięty", "x");
    expect(planSync([], [copy, orphan], [synced("usunięty", "x")], TODAY)).toEqual([]);
  });
});
