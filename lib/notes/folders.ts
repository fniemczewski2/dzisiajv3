// lib/notes/folders.ts
//
// Foldery notatek (np. „Fundacje/Zapłon”): normalizacja nazwy, lista folderów i filtr. Foldery są hierarchiczne
// (ukośnik), a wybór „Fundacje” obejmuje też „Fundacje/Zapłon”. Ten sam format używa synchronizacja z Obsidianem.

/** Zgodne z ograniczeniem w bazie (notes_folder_check: 1–200 znaków). */
export const MAX_FOLDER_LENGTH = 200;

export interface HasFolder {
  folder?: string | null;
}

/**
 * Nazwa folderu bez zbędnych znaków: ukośniki ujednolicone, bez pustych segmentów i spacji na brzegach segmentów,
 * do 200 znaków. Pusty wynik oznacza katalog główny (null).
 */
export function normalizeFolder(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const segments = raw
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const joined = trimTrailingSlashes(segments.join("/").slice(0, MAX_FOLDER_LENGTH));
  return joined === "" ? null : joined;
}

/** Foldery występujące w notatkach wraz z folderami nadrzędnymi, alfabetycznie (z polską kolejnością). */
export function folderOptions(items: readonly HasFolder[]): string[] {
  const all = new Set<string>();
  for (const item of items) {
    const folder = normalizeFolder(item.folder);
    if (!folder) continue;
    const parts = folder.split("/");
    for (let i = 1; i <= parts.length; i++) all.add(parts.slice(0, i).join("/"));
  }
  return [...all].sort((a, b) => a.localeCompare(b, "pl"));
}

export type FolderFilter = { kind: "all" } | { kind: "none" } | { kind: "folder"; folder: string };

export const ALL_FOLDERS: FolderFilter = { kind: "all" };

export function matchesFolder(item: HasFolder, filter: FolderFilter): boolean {
  if (filter.kind === "all") return true;
  const folder = normalizeFolder(item.folder);
  if (filter.kind === "none") return folder === null;
  return folder !== null && (folder === filter.folder || folder.startsWith(`${filter.folder}/`));
}

/** Liczba elementów w każdym folderze (z podfolderami), „none” = bez folderu. */
export function folderCounts(items: readonly HasFolder[]): { none: number; byFolder: Map<string, number> } {
  const byFolder = new Map<string, number>();
  let none = 0;
  for (const folder of folderOptions(items)) {
    byFolder.set(folder, items.filter((item) => matchesFolder(item, { kind: "folder", folder })).length);
  }
  for (const item of items) if (normalizeFolder(item.folder) === null) none++;
  return { none, byFolder };
}

/** Obcina końcowe ukośniki bez wyrażenia regularnego (liniowo, bez cofania się). */
function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
}
