// lib/letterArchive.ts
//
// Pakowanie plików pisma do jednego archiwum ZIP: jeden katalog o nazwie sygnatury,
// w nim podfoldery „pismo” i „odpowiedz” z numerowanymi plikami PDF.

import { zipSync } from "fflate";

export interface ArchiveSource {
  kind: "letter" | "response";
  file_name: string;
}

const FORBIDDEN_IN_NAMES = '<>:"/\\|?*';

/** Nazwa pliku lub folderu bezpieczna na Windows, macOS i Linux. */
export function safeName(value: string, maxLength = 120): string {
  const cleaned = Array.from(value)
    .map((ch) => (ch.charCodeAt(0) < 32 || FORBIDDEN_IN_NAMES.includes(ch) ? "_" : ch))
    .join("")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/^[.\s]+|[.\s]+$/g, "")
    .trim();
  return (cleaned || "plik").slice(0, maxLength);
}

/**
 * Ścieżki wpisów w archiwum (względem katalogu sygnatury).
 * Numer z prefiksem sprawia, że nazwy są unikalne nawet przy identycznych plikach.
 */
export function archiveEntryPaths(items: readonly ArchiveSource[]): string[] {
  const counters: Record<ArchiveSource["kind"], number> = { letter: 0, response: 0 };
  return items.map((item) => {
    counters[item.kind] += 1;
    const folder = item.kind === "letter" ? "pismo" : "odpowiedz";
    const base = safeName(item.file_name.replace(/\.pdf$/i, ""), 100);
    return `${folder}/${String(counters[item.kind]).padStart(2, "0")}_${base}.pdf`;
  });
}

/** Buduje archiwum ZIP: katalog o nazwie sygnatury z podanymi plikami. */
export function buildLetterArchive(
  signature: string,
  files: readonly { path: string; data: Uint8Array }[]
): Uint8Array {
  const root = safeName(signature, 80);
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) entries[`${root}/${file.path}`] = file.data;
  return zipSync(entries, { level: 6 });
}

/** Nazwa pliku ZIP dla sygnatury. */
export function archiveFileName(signature: string): string {
  return `${safeName(signature, 80)}.zip`;
}

/** Wyzwala pobranie pliku w przeglądarce. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
