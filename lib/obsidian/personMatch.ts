// lib/obsidian/personMatch.ts
//
// Wykrywanie duplikatów przy imporcie osób z vaultu: to samo imię i nazwisko (bez wielkości liter, z normalizacją
// Unicode i odstępów). Dopasowanie niepewne (np. tylko imię) nie jest zgadywane – zostaje decyzja użytkownika.

import type { Person } from "@/types/people";

export function personKey(first: string | null | undefined, last: string | null | undefined): string {
  return `${first ?? ""} ${last ?? ""}`.normalize("NFC").toLocaleLowerCase("pl-PL").replaceAll(/\s+/g, " ").trim();
}

/** Osoby z aplikacji o tym samym imieniu i nazwisku co importowany plik. */
export function findPersonDuplicates(
  values: { first_name?: unknown; last_name?: unknown },
  people: ReadonlyArray<Pick<Person, "id" | "first_name" | "last_name">>
): string[] {
  const text = (v: unknown): string => (typeof v === "string" ? v : "");
  const key = personKey(text(values.first_name), text(values.last_name));
  if (!key) return [];
  return people.filter((p) => personKey(p.first_name, p.last_name) === key).map((p) => p.id);
}

/**
 * Scalenie pliku z istniejącą osobą: wartości z aplikacji mają pierwszeństwo, puste pola uzupełnia plik,
 * telefony i e-maile są sumą, notatki z pliku dopisywane, gdy różnią się od notatek w aplikacji.
 */
export function mergePersonChanges(app: Person, fromFile: Record<string, unknown>): Partial<Person> {
  const changes: Record<string, unknown> = {};
  for (const key of ["relationship", "birthday", "nameday", "last_contact_date"] as const) {
    if (!app[key] && fromFile[key]) changes[key] = fromFile[key];
  }
  for (const key of ["phones", "emails"] as const) {
    const merged = [...new Set([...(app[key] ?? []), ...((fromFile[key] as string[] | undefined) ?? [])])];
    if (merged.length !== (app[key] ?? []).length) changes[key] = merged;
  }
  const fileNotes = typeof fromFile.notes === "string" ? fromFile.notes.trim() : "";
  const appNotes = (app.notes ?? "").trim();
  if (fileNotes && !appNotes.includes(fileNotes)) changes.notes = appNotes ? `${appNotes}\n\n${fileNotes}` : fileNotes;
  return changes as Partial<Person>;
}
