// lib/obsidian/syncPlan.ts
//
// Plan synchronizacji dwukierunkowej aplikacja ↔ vault (OneDrive / Google Drive). Czysta logika.
// Zmiany wykrywamy po skrótach treści z ostatniej synchronizacji – chmury zmieniają daty plików bez zmiany treści,
// a nie wszystkie typy mają w bazie datę modyfikacji.
// Zasady: usunięcia nie są przenoszone automatycznie (ani z vaultu, ani do vaultu); przy zmianie po obu stronach
// plik dostaje wersję z aplikacji, a wersja z vaultu zostaje zachowana jako kopia „konflikt”.

import { vaultIdentity } from "@/lib/obsidian/markdown";
import { typeFromPath, type VaultItemType } from "@/lib/obsidian/paths";
import { stringifyFrontMatter, parseFrontMatter } from "@/lib/obsidian/frontMatter";

export interface AppEntry {
  id: string;
  type: VaultItemType;
  path: string;
  markdown: string;
}

export interface RemoteFile {
  fileId: string;
  path: string;
  content: string;
}

export interface SyncStateRow {
  itemId: string;
  fileId: string;
  appHash: string;
  remoteHash: string;
}

export type SyncAction =
  | { kind: "upload"; itemId: string; path: string; markdown: string; fileId: string | null }
  | { kind: "link"; itemId: string; fileId: string }
  | { kind: "updateApp"; itemId: string; type: VaultItemType; file: RemoteFile }
  | {
      kind: "conflict";
      itemId: string;
      path: string;
      markdown: string;
      file: RemoteFile;
      conflictPath: string;
      conflictContent: string;
    }
  | { kind: "import"; type: VaultItemType; file: RemoteFile };

/** Skrót treści (cyrb53) po normalizacji końców linii i końcowych odstępów. */
export function contentHash(text: string): string {
  const s = text.replaceAll("\r\n", "\n").trimEnd();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    // NOSONAR: charCodeAt celowo (jednostki UTF-16); codePointAt zmieniłby skróty znaków spoza BMP zapisane w bazie.
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Ścieżka kopii konfliktu: „Notatki/x.md” → „Notatki/x (konflikt 2026-10-31).md”. */
function conflictPathFor(path: string, date: string): string {
  return path.replace(/\.md$/i, "") + ` (konflikt ${date}).md`;
}

/** Kopia konfliktu: nagłówek oznaczony dzisiaj_conflict_of (bez dzisiaj_id), więc nie zostanie zaimportowana. */
function conflictCopy(content: string, itemId: string): string {
  const { data, body } = parseFrontMatter(content);
  const rest = Object.fromEntries(Object.entries(data).filter(([k]) => k !== "dzisiaj_id"));
  return `${stringifyFrontMatter({ ...rest, dzisiaj_conflict_of: itemId })}\n${body}`;
}

export function planSync(
  app: readonly AppEntry[],
  files: readonly RemoteFile[],
  state: readonly SyncStateRow[],
  today: string
): SyncAction[] {
  const stateById = new Map(state.map((s) => [s.itemId, s]));
  const { byId, imports } = indexFiles(files, stateById);
  const actions: SyncAction[] = [...imports];
  for (const item of app) {
    const action = decide(item, byId.get(item.id), stateById.get(item.id), today);
    if (action) actions.push(action);
  }
  // Pliki z dzisiaj_id nieobecnym w aplikacji (wpis usunięty w aplikacji) – bez działania: usunięcia nie są przenoszone.
  return actions;
}

/** Pliki według dzisiaj_id; pliki bez identyfikatora w znanych folderach – do importu; kopie konfliktów pomijane. */
function indexFiles(
  files: readonly RemoteFile[],
  stateById: Map<string, SyncStateRow>
): { byId: Map<string, RemoteFile>; imports: SyncAction[] } {
  const byId = new Map<string, RemoteFile>();
  const imports: SyncAction[] = [];
  for (const file of files) {
    const identity = vaultIdentity(file.content);
    if (identity.conflictOf) continue;
    if (!identity.id) {
      const type = typeFromPath(file.path);
      if (type) imports.push({ kind: "import", type, file });
      continue;
    }
    // Ten sam identyfikator w kilku plikach (np. ręczna kopia) – liczy się plik znany z poprzedniej synchronizacji.
    if (!byId.has(identity.id) || file.fileId === stateById.get(identity.id)?.fileId) byId.set(identity.id, file);
  }
  return { byId, imports };
}

function decide(
  item: AppEntry,
  file: RemoteFile | undefined,
  st: SyncStateRow | undefined,
  today: string
): SyncAction | null {
  if (!file) return { kind: "upload", itemId: item.id, path: item.path, markdown: item.markdown, fileId: null };
  const appHash = contentHash(item.markdown);
  const remoteHash = contentHash(file.content);
  if (!st)
    return appHash === remoteHash
      ? { kind: "link", itemId: item.id, fileId: file.fileId }
      : conflict(item, file, today);
  const appChanged = appHash !== st.appHash;
  const remoteChanged = remoteHash !== st.remoteHash;
  if (appChanged && remoteChanged) return conflict(item, file, today);
  if (appChanged)
    return { kind: "upload", itemId: item.id, path: file.path, markdown: item.markdown, fileId: file.fileId };
  if (remoteChanged) return { kind: "updateApp", itemId: item.id, type: item.type, file };
  return null;
}

function conflict(item: AppEntry, file: RemoteFile, today: string): SyncAction {
  return {
    kind: "conflict",
    itemId: item.id,
    path: file.path,
    markdown: item.markdown,
    file,
    conflictPath: conflictPathFor(file.path, today),
    conflictContent: conflictCopy(file.content, item.id),
  };
}
