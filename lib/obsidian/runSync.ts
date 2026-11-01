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
} from "@/lib/obsidian/markdown";
import { folderFromNotePath, vaultPath, type VaultItemType } from "@/lib/obsidian/paths";
import { contentHash, planSync, type AppEntry, type RemoteFile, type SyncStateRow } from "@/lib/obsidian/syncPlan";
import type { VaultStorage } from "@/lib/obsidian/storage";

export type VaultNote = Note & { folder?: string | null };

export interface VaultData {
  notes: VaultNote[];
  recipes: Recipe[];
  people: Person[];
  reports: Report[];
}

export interface VaultRepo {
  loadData(): Promise<VaultData>;
  loadState(): Promise<SyncStateRow[]>;
  saveState(rows: SyncStateRow[]): Promise<void>;
  updateItem(type: VaultItemType, id: string, changes: Record<string, unknown>): Promise<void>;
  insertNote(note: { title: string; items: string[]; folder: string | null }): Promise<VaultNote>;
}

export interface SyncSummary {
  uploaded: number;
  updatedInApp: number;
  imported: number;
  conflicts: number;
  skippedImports: number;
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

async function readAll(storage: VaultStorage, maxFiles: number): Promise<RemoteFile[]> {
  const listed = (await storage.list()).slice(0, maxFiles);
  const out: RemoteFile[] = [];
  for (let i = 0; i < listed.length; i += 5) {
    const batch = listed.slice(i, i + 5);
    const contents = await Promise.all(batch.map((f) => storage.read(f.fileId)));
    batch.forEach((f, j) => out.push({ fileId: f.fileId, path: f.path, content: contents[j] }));
  }
  return out;
}

export async function runVaultSync(
  repo: VaultRepo,
  storage: VaultStorage,
  options: { today: string; maxFiles: number }
): Promise<SyncSummary> {
  const data = await repo.loadData();
  const rows = new Map<string, Row>();
  for (const row of data.notes) rows.set(row.id, { type: "note", row });
  for (const row of data.recipes) rows.set(row.id, { type: "recipe", row });
  for (const row of data.people) rows.set(row.id, { type: "person", row });
  for (const row of data.reports) rows.set(row.id, { type: "report", row });

  const entries = [...rows.values()].map(toEntry);
  const files = await readAll(storage, options.maxFiles);
  const state = await repo.loadState();
  const actions = planSync(entries, files, state, options.today);

  const summary: SyncSummary = { uploaded: 0, updatedInApp: 0, imported: 0, conflicts: 0, skippedImports: 0 };
  const newState: SyncStateRow[] = [];
  const record = (itemId: string, fileId: string, appText: string, remoteText: string) =>
    newState.push({ itemId, fileId, appHash: contentHash(appText), remoteHash: contentHash(remoteText) });

  for (const action of actions) {
    switch (action.kind) {
      case "upload": {
        const fileId = await storage.write(action.path, action.markdown, action.fileId);
        record(action.itemId, fileId, action.markdown, action.markdown);
        summary.uploaded++;
        break;
      }
      case "link": {
        const markdown = entries.find((e) => e.id === action.itemId)?.markdown ?? "";
        record(action.itemId, action.fileId, markdown, markdown);
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
        await storage.write(action.path, action.markdown, action.file.fileId);
        await storage.write(action.conflictPath, action.conflictContent, null);
        record(action.itemId, action.file.fileId, action.markdown, action.markdown);
        summary.conflicts++;
        break;
      }
      case "import": {
        if (action.type !== "note") {
          summary.skippedImports++;
          break;
        }
        const parsed = noteFromMarkdown(action.file.content, fileName(action.file.path));
        const note = await repo.insertNote({
          ...parsed,
          folder: parsed.folder ?? folderFromNotePath(action.file.path),
        });
        const markdown = noteToMarkdown(note);
        const fileId = await storage.write(action.file.path, markdown, action.file.fileId);
        record(note.id, fileId, markdown, markdown);
        summary.imported++;
        break;
      }
    }
  }
  if (newState.length > 0) await repo.saveState(newState);
  return summary;
}
