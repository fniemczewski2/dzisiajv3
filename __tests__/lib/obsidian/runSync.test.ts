// __tests__/lib/obsidian/runSync.test.ts
//
// Pełny przebieg synchronizacji w pamięci: repozytorium aplikacji i vault bez sieci.

import { describe, it, expect } from "vitest";
import {
  runVaultSync,
  type ImportDecision,
  type VaultData,
  type VaultNote,
  type VaultRepo,
} from "@/lib/obsidian/runSync";
import type { VaultStorage } from "@/lib/obsidian/storage";
import type { SyncStateRow } from "@/lib/obsidian/syncPlan";

function memoryVault(): VaultStorage & {
  files: Map<string, { path: string; content: string }>;
  failWriteFor: Set<string>;
} {
  const files = new Map<string, { path: string; content: string }>();
  const failWriteFor = new Set<string>();
  let seq = 0;
  return {
    files,
    failWriteFor,
    async list() {
      return [...files.entries()].map(([fileId, f]) => ({ fileId, path: f.path }));
    },
    async read(fileId) {
      return files.get(fileId)?.content ?? "";
    },
    async write(path, content, fileId) {
      if (failWriteFor.has(path)) throw new Error(`symulowany błąd zapisu: ${path}`);
      const id = fileId ?? `f${++seq}`;
      files.set(id, { path: files.get(id)?.path ?? path, content });
      return id;
    },
  };
}

function memoryRepo(data: VaultData) {
  let state: SyncStateRow[] = [];
  const decisions = new Map<string, ImportDecision>();
  const updates: { type: string; id: string; changes: Record<string, unknown> }[] = [];
  const deletions: { type: string; id: string }[] = [];
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
    async loadDecisions() {
      return [...decisions.values()].map((d) => ({ ...d }));
    },
    async addDecision(d) {
      decisions.set(d.fileId, {
        fileId: d.fileId,
        path: d.path,
        status: "pending",
        personId: null,
        candidateIds: d.candidateIds,
      });
    },
    async closeDecision(fileId) {
      decisions.delete(fileId);
    },
    async deleteItem(type, id) {
      deletions.push({ type, id });
      const list = { note: data.notes, recipe: data.recipes, person: data.people, report: data.reports }[type] as {
        id: string;
      }[];
      const idx = list.findIndex((r) => r.id === id);
      if (idx !== -1) list.splice(idx, 1);
    },
  };
  return { repo, updates, decisions, deletions, getState: () => state };
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
      pendingDuplicates: 0,
      remaining: 0,
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

  it("błąd zapisu dzisiaj_id po imporcie NOWEGO wiersza cofa go zamiast tworzyć duplikat przy kolejnej synchronizacji", async () => {
    const vault = memoryVault();
    const d: VaultData = { notes: [], recipes: [], people: [], reports: [] };
    const { repo, deletions } = memoryRepo(d);
    vault.files.set("x1", { path: "Notatki/Fundacja/Pomysły.md", content: "pierwszy\ndrugi\n" });
    vault.failWriteFor.add("Notatki/Fundacja/Pomysły.md");

    await expect(runVaultSync(repo, vault, OPTS)).rejects.toThrow("symulowany błąd zapisu");
    expect(d.notes).toHaveLength(0); // wiersz cofnięty, nie został osieroconym duplikatem
    expect(deletions).toEqual([{ type: "note", id: "new-0" }]);

    // Plik nadal nie ma dzisiaj_id (zapis się nie powiódł) – naprawiamy usterkę i ponawiamy.
    vault.failWriteFor.delete("Notatki/Fundacja/Pomysły.md");
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ imported: 1, skippedImports: 0 });
    expect(d.notes).toHaveLength(1);

    // Kolejna synchronizacja nie tworzy drugiej kopii.
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ imported: 0, uploaded: 0 });
    expect(d.notes).toHaveLength(1);
  });

  it("błąd zapisu przy SCALENIU duplikatu osoby NIE kasuje istniejącej osoby (isNew=false)", async () => {
    const vault = memoryVault();
    const d = data();
    const { repo, decisions, deletions } = memoryRepo(d);
    vault.files.set("v1", {
      path: "Osoby/Rodzina/Anna Nowak.md",
      content: '---\ntags:\n  - Osoby/Rodzina\nphones: ["600100200"]\n---\nCiocia\n',
    });
    await runVaultSync(repo, vault, OPTS); // tworzy decyzję "pending" (duplikat Anny Nowak)
    decisions.set("v1", { ...decisions.get("v1")!, status: "merge", personId: "p1" });
    vault.failWriteFor.add("Osoby/Rodzina/Anna Nowak.md");

    await expect(runVaultSync(repo, vault, OPTS)).rejects.toThrow("symulowany błąd zapisu");
    expect(deletions).toEqual([]); // nic nie zostało cofnięte
    expect(d.people.find((p) => p.id === "p1")).toBeTruthy(); // Anna Nowak nadal istnieje
    expect(d.people.find((p) => p.id === "p1")!.phones).toEqual(["600100200"]); // zmiany ze scalenia zachowane

    vault.failWriteFor.delete("Osoby/Rodzina/Anna Nowak.md");
    await runVaultSync(repo, vault, OPTS);
    expect(d.people).toHaveLength(1); // wciąż jedna osoba, nie dwie
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

  it("import osoby: duplikat czeka na decyzję i blokuje osobny plik osoby z aplikacji", async () => {
    const vault = memoryVault();
    const { repo, decisions } = memoryRepo(data());
    vault.files.set("v1", {
      path: "Osoby/Rodzina/Anna Nowak.md",
      content: "---\ntags:\n  - Osoby/Rodzina\n---\nCiocia\n",
    });
    vault.files.set("v2", {
      path: "Osoby/Jan Kowalski.md",
      content: "---\nupdated: 2026-01-01T10:00:00\n---\nKolega\n",
    });
    const summary = await runVaultSync(repo, vault, OPTS);
    expect(summary).toMatchObject({ pendingDuplicates: 1, imported: 1 });
    expect(decisions.get("v1")).toMatchObject({ status: "pending", candidateIds: ["p1"] });
    expect([...vault.files.values()].some((f) => f.path === "Osoby/Anna Nowak.md")).toBe(false);
    // Nowa osoba z vaultu: priorytet 5; plik zachowuje pole updated.
    const jan = vault.files.get("v2")?.content ?? "";
    expect(jan).toContain("priority: 5");
    expect(jan).toContain("updated:");
    // Ponowna synchronizacja nie tworzy drugiej decyzji ani osoby.
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ pendingDuplicates: 1, imported: 0, uploaded: 0 });
  });

  it("decyzje: scal uzupełnia osobę i łączy plik, pomiń zostawia plik bez zmian", async () => {
    const vault = memoryVault();
    const d = data();
    const { repo, decisions } = memoryRepo(d);
    vault.files.set("v1", {
      path: "Osoby/Rodzina/Anna Nowak.md",
      content: '---\naliases:\n  - Ciocia Ania\ntags:\n  - Osoby/Rodzina\nphones: ["600100200"]\n---\nCiocia\n',
    });
    vault.files.set("v2", { path: "Osoby/Anna Nowak.md", content: "Kopia\n" });
    await runVaultSync(repo, vault, OPTS);
    expect(decisions.size).toBe(2);
    decisions.set("v1", { ...decisions.get("v1")!, status: "merge", personId: "p1" });
    decisions.set("v2", { ...decisions.get("v2")!, status: "skip" });
    const summary = await runVaultSync(repo, vault, OPTS);
    expect(summary).toMatchObject({ imported: 1, pendingDuplicates: 0, uploaded: 0 });
    const anna = d.people.find((p) => p.id === "p1")!;
    expect(anna.phones).toEqual(["600100200"]);
    expect(anna.notes).toBe("Ciocia");
    const merged = vault.files.get("v1")!.content;
    expect(merged).toContain('dzisiaj_id: "p1"');
    expect(merged).toContain('aliases: ["Ciocia Ania"]');
    expect(merged).toContain('tags: ["Osoby/Rodzina"');
    expect(vault.files.get("v2")!.content).toBe("Kopia\n");
    expect(decisions.has("v1")).toBe(false);
    expect(decisions.get("v2")?.status).toBe("skip");
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ imported: 0, uploaded: 0, conflicts: 0 });
  });

  it("dzisiaj_ignore i pliki spoza folderów synchronizacji nie są importowane ani czytane", async () => {
    const vault = memoryVault();
    const { repo } = memoryRepo({ notes: [], recipes: [], people: [], reports: [] });
    vault.files.set("v1", { path: "Osoby/Urodziny.md", content: "---\ndzisiaj_ignore: true\n---\nlista\n" });
    vault.files.set("v2", { path: "Zapłon/Cele.md", content: "SMART\n" });
    let reads = 0;
    const counting = { ...vault, read: async (id: string) => (reads++, vault.read(id)) };
    expect(await runVaultSync(repo, counting, OPTS)).toMatchObject({ imported: 0, pendingDuplicates: 0 });
    expect(reads).toBe(1);
  });

  it("zmiana w aplikacji nie usuwa pól dodanych w Obsidianie", async () => {
    const vault = memoryVault();
    const d = data();
    const { repo } = memoryRepo(d);
    await runVaultSync(repo, vault, OPTS);
    const [id, file] = [...vault.files.entries()].find(([, f]) => f.path === "Przepisy/Zupa.md")!;
    const withExtra = file.content.replace("---\n", "---\nauthor:\n  - F.Niemczewski\n");
    vault.files.set(id, { ...file, content: withExtra });
    await runVaultSync(repo, vault, OPTS);
    d.recipes[0].description = "Gotować 20 minut.";
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ uploaded: 1, conflicts: 0 });
    const after = vault.files.get(id)!.content;
    expect(after).toContain('author: ["F.Niemczewski"]');
    expect(after).toContain("Gotować 20 minut.");
  });

  it("limit czasu: przerwany przebieg zapisuje stan i zwraca remaining; kolejny kończy pracę bez duplikatów", async () => {
    const vault = memoryVault();
    const { repo, getState } = memoryRepo(data());
    const first = await runVaultSync(repo, vault, { ...OPTS, deadline: Date.now() - 1 });
    expect(first).toMatchObject({ uploaded: 0, remaining: 4 });
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ uploaded: 4, remaining: 0 });
    expect(getState()).toHaveLength(4);
    expect(await runVaultSync(repo, vault, OPTS)).toMatchObject({ uploaded: 0, remaining: 0 });
    expect(vault.files.size).toBe(4);
  });
});
