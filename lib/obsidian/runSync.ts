// lib/obsidian/runSync.ts
//
// Wykonanie synchronizacji: dane aplikacji → Markdown → plan (syncPlan) → zapis w vaulcie i w aplikacji.
// Dostęp do bazy przez wstrzykiwane repozytorium (testy w pamięci), do chmury przez VaultStorage.

import type { Note } from "@/types/notes";
import type { Person } from "@/types/people";
import type { Recipe } from "@/types/recipes";
import { RECIPE_CATEGORIES } from "@/types/recipes";
import type { Report } from "@/types/reports";
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
import { VAULT_FOLDERS, folderFromNotePath, vaultPath, type VaultItemType } from "@/lib/obsidian/paths";
import { importValues, type ImportableType, type ImportValues } from "@/lib/obsidian/importItems";
import { contentHash, planSync, type AppEntry, type RemoteFile, type SyncStateRow } from "@/lib/obsidian/syncPlan";
import type { VaultStorage } from "@/lib/obsidian/storage";
import { isIgnoredFile, mergeIntoExisting } from "@/lib/obsidian/merge";
import { findPersonDuplicates, mergePersonChanges } from "@/lib/obsidian/personMatch";

export type VaultNote = Note & { folder?: string | null };

export interface VaultData {
  notes: VaultNote[];
  recipes: Recipe[];
  people: Person[];
  reports: Report[];
}

/** Decyzja o pliku osoby z vaultu, który pasuje do istniejącej osoby (duplikat). */
export type ImportDecisionStatus = "pending" | "merge" | "create" | "skip";

export interface ImportDecision {
  fileId: string;
  path: string;
  status: ImportDecisionStatus;
  /** Osoba, z którą scalić plik (status „merge”). */
  personId: string | null;
  candidateIds: string[];
}

export interface VaultRepo {
  loadData(): Promise<VaultData>;
  loadState(): Promise<SyncStateRow[]>;
  saveState(rows: SyncStateRow[]): Promise<void>;
  updateItem(type: VaultItemType, id: string, changes: Record<string, unknown>): Promise<void>;
  insertNote(note: { title: string; items: string[]; folder: string | null }): Promise<VaultNote>;
  /** Nowy przepis, osoba albo protokół z pliku utworzonego w Obsidianie; zwraca zapisany wiersz. */
  insertItem(type: ImportableType, values: ImportValues): Promise<Recipe | Person | Report>;
  loadDecisions(): Promise<ImportDecision[]>;
  /** Nowy duplikat do decyzji użytkownika (status „pending”). */
  addDecision(decision: { fileId: string; path: string; candidateIds: string[]; values: ImportValues }): Promise<void>;
  /** Decyzja wykonana – usunięcie wpisu („skip” zostaje, żeby plik nie wracał do importu). */
  closeDecision(fileId: string): Promise<void>;
}

export interface SyncSummary {
  uploaded: number;
  updatedInApp: number;
  imported: number;
  conflicts: number;
  skippedImports: number;
  /** Pliki osób czekające na decyzję (duplikat istniejącej osoby). */
  pendingDuplicates: number;
  /** Działania niewykonane w tym przebiegu (limit czasu) – klient wywołuje synchronizację ponownie. */
  remaining: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const fileName = (path: string) => (path.split("/").pop() ?? path).replace(/\.md$/i, "");

type Row =
  | { type: "note"; row: VaultNote }
  | { type: "recipe"; row: Recipe }
  | { type: "person"; row: Person }
  | { type: "report"; row: Report };

function toEntry(item: Row): AppEntry {
  switch (item.type) {
    case "note":
      return {
        id: item.row.id,
        type: "note",
        path: vaultPath("note", item.row.title, item.row.folder),
        markdown: noteToMarkdown(item.row),
      };
    case "recipe":
      return {
        id: item.row.id,
        type: "recipe",
        path: vaultPath("recipe", item.row.name),
        markdown: recipeToMarkdown(item.row),
      };
    case "person":
      return {
        id: item.row.id,
        type: "person",
        path: vaultPath("person", `${item.row.first_name} ${item.row.last_name}`),
        markdown: personToMarkdown(item.row),
      };
    case "report":
      return {
        id: item.row.id,
        type: "report",
        path: vaultPath("report", `${item.row.date} ${item.row.topic}`),
        markdown: reportToMarkdown(item.row),
      };
  }
}

/** Zmiany z pliku dla danego typu – tylko poprawne wartości; reszta pól zostaje bez zmian. */
function changesFromFile(item: Row, file: RemoteFile): { changes: Record<string, unknown>; updated: Row } {
  switch (item.type) {
    case "note": {
      const parsed = noteFromMarkdown(file.content, fileName(file.path));
      const changes = {
        title: parsed.title,
        items: parsed.items,
        folder: parsed.folder ?? folderFromNotePath(file.path),
      };
      return { changes, updated: { type: "note", row: { ...item.row, ...changes } } };
    }
    case "recipe": {
      const parsed = recipeFromMarkdown(file.content, fileName(file.path));
      const category = (RECIPE_CATEGORIES as readonly string[]).includes(parsed.category)
        ? parsed.category
        : item.row.category;
      const changes = { name: parsed.name, products: parsed.products, description: parsed.description, category };
      return { changes, updated: { type: "recipe", row: { ...item.row, ...changes } as Recipe } };
    }
    case "person": {
      const parsed = personFromMarkdown(file.content);
      const changes = Object.fromEntries(
        Object.entries(parsed).filter(([k, v]) => !((k === "first_name" || k === "last_name") && !v))
      ) as Partial<Person>;
      return { changes, updated: { type: "person", row: { ...item.row, ...changes } } };
    }
    case "report": {
      const parsed = reportFromMarkdown(file.content, item.row);
      const changes = {
        ...parsed,
        ...(parsed.date && ISO_DATE.test(parsed.date) ? {} : { date: item.row.date }),
        ...(parsed.topic ? {} : { topic: item.row.topic }),
      };
      return { changes, updated: { type: "report", row: { ...item.row, ...changes } } };
    }
  }
}

const SYNCED_FOLDERS = new Set<string>(Object.values(VAULT_FOLDERS));
/** Równoległe odczyty plików z chmury (Graph / Drive dobrze znoszą kilkanaście naraz). */
const READ_CONCURRENCY = 12;
/** Stan zapisywany co tyle działań – przerwanie funkcji (limit czasu) nie gubi wykonanej pracy. */
const STATE_FLUSH_EVERY = 20;

/**
 * Czytane są tylko pliki z folderów synchronizacji (Notatki, Przepisy, Osoby, Protokoły) oraz pliki znane
 * z poprzedniej synchronizacji (przeniesione w Obsidianie) – reszta vaultu nie jest pobierana.
 */
async function readAll(storage: VaultStorage, maxFiles: number, knownIds: ReadonlySet<string>): Promise<RemoteFile[]> {
  const listed = (await storage.list())
    .filter((f) => SYNCED_FOLDERS.has(f.path.split("/")[0]) || knownIds.has(f.fileId))
    .slice(0, maxFiles);
  const out: RemoteFile[] = [];
  for (let i = 0; i < listed.length; i += READ_CONCURRENCY) {
    const batch = listed.slice(i, i + READ_CONCURRENCY);
    const contents = await Promise.all(batch.map((f) => storage.read(f.fileId)));
    batch.forEach((f, j) => out.push({ fileId: f.fileId, path: f.path, content: contents[j] }));
  }
  return out;
}

/** Nowy plik z Obsidiana → wiersz w aplikacji (notatka z folderem ze ścieżki albo przepis, osoba, protokół). */
async function importFile(
  repo: VaultRepo,
  action: { type: VaultItemType; file: RemoteFile },
  today: string
): Promise<Row> {
  const name = fileName(action.file.path);
  if (action.type === "note") {
    const parsed = noteFromMarkdown(action.file.content, name);
    const note = await repo.insertNote({ ...parsed, folder: parsed.folder ?? folderFromNotePath(action.file.path) });
    return { type: "note", row: note };
  }
  const values: ImportValues = importValues(action.type, action.file.content, name, today);
  const row = await repo.insertItem(action.type, values);
  return { type: action.type, row } as Row;
}

type PersonOutcome = { kind: "imported"; row: Row } | { kind: "pending"; candidateIds: string[] } | { kind: "skipped" };

/**
 * Plik osoby bez dzisiaj_id: decyzja użytkownika (scal / utwórz / pomiń), a bez decyzji – nowy wiersz,
 * o ile nie ma osoby o tym samym imieniu i nazwisku; wtedy powstaje decyzja „pending” i plik czeka.
 */
async function importPerson(
  repo: VaultRepo,
  file: RemoteFile,
  rows: Map<string, Row>,
  decisions: Map<string, ImportDecision>,
  today: string
): Promise<PersonOutcome> {
  const values = importValues("person", file.content, fileName(file.path), today);
  const decision = decisions.get(file.fileId);
  if (decision?.status === "pending" || decision?.status === "skip") {
    return decision.status === "pending"
      ? { kind: "pending", candidateIds: decision.candidateIds }
      : { kind: "skipped" };
  }
  if (decision?.status === "merge") {
    const target = decision.personId ? rows.get(decision.personId) : undefined;
    if (target?.type !== "person") return { kind: "pending", candidateIds: decision.candidateIds };
    const changes = mergePersonChanges(target.row, values);
    if (Object.keys(changes).length > 0) await repo.updateItem("person", target.row.id, changes);
    await repo.closeDecision(file.fileId);
    return { kind: "imported", row: { type: "person", row: { ...target.row, ...changes } } };
  }
  if (decision?.status !== "create") {
    const people = [...rows.values()].filter((r) => r.type === "person").map((r) => r.row as Person);
    const candidateIds = findPersonDuplicates(values, people);
    if (candidateIds.length > 0) {
      await repo.addDecision({ fileId: file.fileId, path: file.path, candidateIds, values });
      return { kind: "pending", candidateIds };
    }
  }
  const row = (await repo.insertItem("person", values)) as Person;
  if (decision) await repo.closeDecision(file.fileId);
  return { kind: "imported", row: { type: "person", row } };
}

export async function runVaultSync(
  repo: VaultRepo,
  storage: VaultStorage,
  options: {
    today: string;
    maxFiles: number;
    /** Czas (ms od epoki), po którym nie zaczynamy nowych działań. */ deadline?: number;
  }
): Promise<SyncSummary> {
  const data = await repo.loadData();
  const rows = new Map<string, Row>();
  for (const row of data.notes) rows.set(row.id, { type: "note", row });
  for (const row of data.recipes) rows.set(row.id, { type: "recipe", row });
  for (const row of data.people) rows.set(row.id, { type: "person", row });
  for (const row of data.reports) rows.set(row.id, { type: "report", row });

  const entries = [...rows.values()].map(toEntry);
  const state = await repo.loadState();
  // dzisiaj_ignore dotyczy tylko plików jeszcze niepowiązanych (bez dzisiaj_id) – blokuje ich import.
  const files = (await readAll(storage, options.maxFiles, new Set(state.map((s) => s.fileId)))).filter(
    (f) => !isIgnoredFile(f.content) || vaultIdentity(f.content).id !== null
  );
  const fileById = new Map(files.map((f) => [f.fileId, f]));
  const decisions = new Map((await repo.loadDecisions()).map((d) => [d.fileId, d]));
  const actions = planSync(entries, files, state, options.today);

  const summary: SyncSummary = {
    uploaded: 0,
    updatedInApp: 0,
    imported: 0,
    conflicts: 0,
    skippedImports: 0,
    pendingDuplicates: 0,
    remaining: 0,
  };
  const newState: SyncStateRow[] = [];
  const record = (itemId: string, fileId: string, appText: string, remoteText: string) =>
    newState.push({ itemId, fileId, appHash: contentHash(appText), remoteHash: contentHash(remoteText) });
  /** Osoby powiązane w tym przebiegu z plikiem z vaultu albo czekające na decyzję – bez osobnego pliku z aplikacji. */
  const handled = new Set<string>();
  for (const d of decisions.values()) {
    if (d.status === "pending" && fileById.has(d.fileId)) d.candidateIds.forEach((id) => handled.add(id));
  }

  /** Zapis wersji z aplikacji do istniejącego pliku z zachowaniem pól dodanych w Obsidianie. */
  const writeMerged = async (path: string, markdown: string, fileId: string | null, existing?: string) => {
    const text = mergeIntoExisting(markdown, existing ?? (fileId ? fileById.get(fileId)?.content : undefined));
    return { fileId: await storage.write(path, text, fileId), text };
  };

  const flush = async () => {
    if (newState.length === 0) return;
    await repo.saveState(newState.splice(0));
  };
  for (const [index, action] of actions.entries()) {
    if (options.deadline !== undefined && Date.now() > options.deadline) {
      summary.remaining = actions.length - index;
      break;
    }
    if (newState.length >= STATE_FLUSH_EVERY) await flush();
    switch (action.kind) {
      case "upload": {
        if (handled.has(action.itemId)) break;
        const written = await writeMerged(action.path, action.markdown, action.fileId);
        record(action.itemId, written.fileId, action.markdown, written.text);
        summary.uploaded++;
        break;
      }
      case "link": {
        const markdown = entries.find((e) => e.id === action.itemId)?.markdown ?? "";
        record(action.itemId, action.fileId, markdown, fileById.get(action.fileId)?.content ?? markdown);
        break;
      }
      case "updateApp": {
        const item = rows.get(action.itemId);
        if (!item) break;
        const { changes, updated } = changesFromFile(item, action.file);
        await repo.updateItem(item.type, item.row.id, changes);
        record(action.itemId, action.file.fileId, toEntry(updated).markdown, action.file.content);
        summary.updatedInApp++;
        break;
      }
      case "conflict": {
        const written = await writeMerged(action.path, action.markdown, action.file.fileId, action.file.content);
        await storage.write(action.conflictPath, action.conflictContent, null);
        record(action.itemId, action.file.fileId, action.markdown, written.text);
        summary.conflicts++;
        break;
      }
      case "import": {
        let imported: Row;
        if (action.type === "person") {
          const outcome = await importPerson(repo, action.file, rows, decisions, options.today);
          if (outcome.kind === "pending") {
            summary.pendingDuplicates++;
            outcome.candidateIds.forEach((id) => handled.add(id));
            break;
          }
          if (outcome.kind === "skipped") break;
          imported = outcome.row;
          handled.add(imported.row.id);
        } else {
          imported = await importFile(repo, action, options.today);
        }
        rows.set(imported.row.id, imported);
        const markdown = toEntry(imported).markdown;
        const written = await writeMerged(action.file.path, markdown, action.file.fileId, action.file.content);
        record(imported.row.id, written.fileId, markdown, written.text);
        summary.imported++;
        break;
      }
    }
  }
  await flush();
  return summary;
}
