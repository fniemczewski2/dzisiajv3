// __tests__/lib/obsidian/runSync.test.ts
//
// Pełny przebieg synchronizacji w pamięci: repozytorium aplikacji i vault bez sieci.

import { describe, it, expect } from "vitest";
import { runVaultSync, type VaultData, type VaultNote, type VaultRepo } from "@/lib/obsidian/runSync";
import type { VaultStorage } from "@/lib/obsidian/storage";
import type { SyncStateRow } from "@/lib/obsidian/syncPlan";

function memoryVault(): VaultStorage & { files: Map<string, { path: string; content: string }> } {
  const files = new Map<string, { path: string; content: string }>();
  let seq = 0;
  return {
    files,
    async list() {
      return [...files.entries()].map(([fileId, f]) => ({ fileId, path: f.path }));
    },
    async read(fileId) {
      return files.get(fileId)?.content ?? "";
    },
    async write(path, content, fileId) {
      const id = fileId ?? `f${++seq}`;
      files.set(id, { path: files.get(id)?.path ?? path, content });
      return id;
    },
  };
}

function memoryRepo(data: VaultData) {
  let state: SyncStateRow[] = [];
  const updates: { type: string; id: string; changes: Record<string, unknown> }[] = [];
  const repo: VaultRepo = {
    async loadData() {
      return data;
    },
    async loadState() {
      return state;
    },
    async saveState(rows) {
      const byId = new Map(state.map((s) => [s.itemId, s]));
      for (const r of rows) byId.set(r.itemId, r);
      state = [...byId.values()];
    },
    async updateItem(type, id, changes) {
      updates.push({ type, id, changes });
      const list = { note: data.notes, recipe: data.recipes, person: data.people, report: data.reports }[type] as {
        id: string;
      }[];
      const row = list.find((r) => r.id === id);
      if (row) Object.assign(row, changes);
    },
    async insertNote(note) {
      const row = {
        ...note,
        id: `new-${data.notes.length}`,
        user_id: "u",
        bg_color: "x",
        pinned: false,
        archived: false,
      } as VaultNote;
      data.notes.push(row);
      return row;
    },
    async insertItem(type, values) {
      const list = { recipe: data.recipes, person: data.people, report: data.reports }[type] as { id: string }[];
      const row = { ...values, id: `new-${type}-${list.length}`, user_id: "u" } as never;
      list.push(row);
      return row;
    },
  };
  return { repo, updates, getState: () => state };
}

const data = (): VaultData => ({
  notes: [{ id: "n1", user_id: "u", title: "Lista", items: ["- mleko"], bg_color: "x", folder: "Dom" } as VaultNote],
  recipes: [
    { id: "r1", user_id: "u", name: "Zupa", category: "zupa", products: ["marchew"], description: "Gotować." } as never,
  ],
  people: [
    {
      id: "p1",
      user_id: "u",
      first_name: "Anna",
      last_name: "Nowak",
      relationship: "",
      priority: 1,
      phones: [],
      emails: [],
      notes: "",
    } as never,
  ],
  reports: [
    {
      id: "rep1",
      user_id: "u",
      topic: "Zarząd",
      date: "2026-10-31",
      agenda: [],
      participants: [],
      tasks: [],
      notes: "",
    } as never,
  ],
});

const OPTS = { today: "2026-10-31", maxFiles: 100 };

describe("runVaultSync", () => {
  it("pierwsza synchronizacja zapisuje wszystkie typy we właściwych folderach; druga nie robi nic", async () => {
    const vault = memoryVault();
    const { repo } = memoryRepo(data());
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ uploaded: 4, conflicts: 0 });
    expect([...vault.files.values()].map((f) => f.path).sort()).toEqual([
      "Notatki/Dom/Lista.md",
      "Osoby/Anna Nowak.md",
      "Protokoły/2026-10-31 Zarząd.md",
      "Przepisy/Zupa.md",
    ]);
    expect(await runVaultSync(repo, vault, OPTS)).toEqual({
      uploaded: 0,
      updatedInApp: 0,
      imported: 0,
      conflicts: 0,
      skippedImports: 0,
    });
  });

  it("edycja w Obsidianie trafia do aplikacji; niepoprawna kategoria przepisu nie nadpisuje poprawnej", async () => {
    const vault = memoryVault();
    const { repo, updates } = memoryRepo(data());
    await runVaultSync(repo, vault, OPTS);
    for (const [id, f] of vault.files) {
      if (f.path === "Notatki/Dom/Lista.md")
        vault.files.set(id, { ...f, content: f.content.replace("- mleko", "- mleko\n- chleb") });
      if (f.path === "Przepisy/Zupa.md")
        vault.files.set(id, {
          ...f,
          content: f.content.replace('"zupa"', '"nieznana"').replace("Gotować.", "Gotować 30 min."),
        });
    }
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ updatedInApp: 2, uploaded: 0 });
    expect(updates.find((u) => u.id === "n1")?.changes).toMatchObject({ items: ["- mleko", "- chleb"], folder: "Dom" });
    expect(updates.find((u) => u.id === "r1")?.changes).toMatchObject({
      category: "zupa",
      description: "Gotować 30 min.",
    });
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ updatedInApp: 0, uploaded: 0 });
  });

  it("nowe pliki z Obsidiana: notatka (folder ze ścieżki), przepis, osoba i protokół są importowane i dostają dzisiaj_id", async () => {
    const vault = memoryVault();
    const { repo } = memoryRepo({ notes: [], recipes: [], people: [], reports: [] });
    vault.files.set("x1", { path: "Notatki/Fundacja/Pomysły.md", content: "pierwszy\ndrugi\n" });
    vault.files.set("x2", { path: "Przepisy/Placki.md", content: "## Składniki\n- mąka\n" });
    vault.files.set("x3", {
      path: "Osoby/Jan Kowalski.md",
      content: "---\nrelationship: kolega\npriority: 3\nbirthday: 1990-05-17\nphones:\n  - 600100200\n---\nuwagi\n",
    });
    vault.files.set("x4", {
      path: "Protokoły/2026-11-01 Zebranie zarządu.md",
      content: "## Porządek\n- punkt pierwszy\n\n## Zadania\n- [ ] Zrobić X — Anna — 2026-11-10\n\n## Notatki\nOk\n",
    });
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ imported: 4, skippedImports: 0 });
    const note = vault.files.get("x1")?.content ?? "";
    expect(note).toContain('dzisiaj_id: "new-0"');
    expect(note).toContain('folder: "Fundacja"');
    expect(note).toContain('title: "Pomysły"');
    expect(vault.files.get("x2")?.content).toContain('dzisiaj_id: "new-recipe-0"');
    expect(vault.files.get("x3")?.content).toContain('dzisiaj_id: "new-person-0"');
    expect(vault.files.get("x3")?.content).toContain('first_name: "Jan"');
    expect(vault.files.get("x4")?.content).toContain('dzisiaj_id: "new-report-0"');
    expect(vault.files.get("x4")?.content).toContain('topic: "Zebranie zarządu"');
  });

  it("zaimportowane pliki nie są importowane ponownie przy kolejnej synchronizacji", async () => {
    const vault = memoryVault();
    const d: VaultData = { notes: [], recipes: [], people: [], reports: [] };
    const { repo } = memoryRepo(d);
    vault.files.set("x2", { path: "Przepisy/Placki.md", content: "## Składniki\n- mąka\n" });
    vault.files.set("x3", { path: "Osoby/Jan Kowalski.md", content: "uwagi\n" });
    await runVaultSync(repo, vault, OPTS);
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ imported: 0, uploaded: 0, conflicts: 0 });
    expect(d.recipes).toHaveLength(1);
    expect(d.people).toHaveLength(1);
  });

  it("zmiana po obu stronach: wersja aplikacji w pliku i kopia konfliktu", async () => {
    const vault = memoryVault();
    const d = data();
    const { repo } = memoryRepo(d);
    await runVaultSync(repo, vault, OPTS);
    d.notes[0].items = ["- z aplikacji"];
    for (const [id, f] of vault.files) {
      if (f.path === "Notatki/Dom/Lista.md")
        vault.files.set(id, { ...f, content: f.content.replace("- mleko", "- z vaultu") });
    }
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ conflicts: 1 });
    const paths = [...vault.files.values()].map((f) => f.path);
    expect(paths).toContain("Notatki/Dom/Lista (konflikt 2026-10-31).md");
    const original = [...vault.files.values()].find((f) => f.path === "Notatki/Dom/Lista.md");
    expect(original?.content).toContain("- z aplikacji");
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ conflicts: 0, imported: 0, uploaded: 0 });
  });
});
