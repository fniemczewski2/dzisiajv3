// lib/obsidian/paths.ts
//
// Ścieżki plików w vaulcie. Tożsamość wpisu wyznacza dzisiaj_id w nagłówku, nie ścieżka –
// zmiana nazwy lub przeniesienie pliku w Obsidianie nie zrywa powiązania.

export const VAULT_FOLDERS = { note: "Notatki", recipe: "Przepisy", person: "Osoby", report: "Protokoły" } as const;
export type VaultItemType = keyof typeof VAULT_FOLDERS;

const FORBIDDEN = /[\\/:*?"<>|#^[\]]/g;

/** Nazwa pliku lub folderu bezpieczna w Windows, macOS, Androidzie, iOS i w linkach Obsidiana. */
export function safeSegment(value: string, max = 80): string {
  const cleaned = Array.from(value)
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join("")
    .replace(FORBIDDEN, "-")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/^[.\s-]+|[.\s]+$/g, "")
    .slice(0, max)
    .trim();
  return cleaned || "bez nazwy";
}

/** Folder notatki „Fundacje/Zapłon” → bezpieczne segmenty; pusty → brak podfolderu. */
export function noteFolderPath(folder: string | null | undefined): string {
  if (!folder) return "";
  return folder
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => safeSegment(s, 60))
    .join("/");
}

export function vaultPath(type: VaultItemType, name: string, folder?: string | null): string {
  const sub = type === "note" ? noteFolderPath(folder) : "";
  return [VAULT_FOLDERS[type], sub, `${safeSegment(name)}.md`].filter(Boolean).join("/");
}

/** Typ wpisu z pierwszego segmentu ścieżki (import plików utworzonych w Obsidianie). */
export function typeFromPath(path: string): VaultItemType | null {
  const top = path.split("/")[0];
  const entry = Object.entries(VAULT_FOLDERS).find(([, folder]) => folder === top);
  return entry ? (entry[0] as VaultItemType) : null;
}

/** Folder notatki z jej ścieżki („Notatki/A/B/x.md” → „A/B”). */
export function folderFromNotePath(path: string): string | null {
  const parts = path.split("/").slice(1, -1);
  return parts.length > 0 ? parts.join("/") : null;
}
