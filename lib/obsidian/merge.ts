// lib/obsidian/merge.ts
//
// Zapis wersji z aplikacji do istniejącego pliku vaultu bez utraty pól dodanych w Obsidianie (aliases, author,
// własne tagi, cssclasses…). Pola zarządzane przez aplikację mają wartość z aplikacji; tagi są sumą obu list;
// `updated` – późniejsza z dwóch dat (aplikacja dla osób zapisuje datę utworzenia wpisu).

import { parseFrontMatter, stringifyFrontMatter, type FrontMatter } from "@/lib/obsidian/frontMatter";

function asList(v: FrontMatter[string] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === "string" && v ? [v] : [];
}

/** Porównanie dat ISO po pierwszych 19 znakach (RRRR-MM-DDTHH:mm:ss) – formaty z aplikacji i z Lintera się różnią. */
function later(a: FrontMatter[string] | undefined, b: FrontMatter[string] | undefined): FrontMatter[string] {
  const sa = typeof a === "string" ? a : "";
  const sb = typeof b === "string" ? b : "";
  if (!sa) return sb || null;
  if (!sb) return sa;
  return sa.slice(0, 19).replace(" ", "T") >= sb.slice(0, 19).replace(" ", "T") ? sa : sb;
}

export function mergeIntoExisting(appMarkdown: string, existing: string | null | undefined): string {
  if (!existing) return appMarkdown;
  const app = parseFrontMatter(appMarkdown);
  const old = parseFrontMatter(existing);
  const merged: FrontMatter = { ...app.data };
  for (const [key, value] of Object.entries(old.data)) {
    if (key in merged || key.startsWith("dzisiaj_")) continue;
    merged[key] = value;
  }
  const tags = [...new Set([...asList(old.data.tags), ...asList(app.data.tags)])];
  if (tags.length > 0) merged.tags = tags;
  if ("updated" in old.data || "updated" in app.data) merged.updated = later(app.data.updated, old.data.updated);
  return `${stringifyFrontMatter(merged)}\n${app.body}`;
}

/** Plik oznaczony w Obsidianie jako niepodlegający importowi (np. zestawienie w folderze „Osoby”). */
export function isIgnoredFile(content: string): boolean {
  const v = parseFrontMatter(content).data.dzisiaj_ignore;
  return v === true || v === "true";
}
