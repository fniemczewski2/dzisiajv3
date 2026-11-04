// lib/obsidian/importItems.ts
//
// Nowe pliki utworzone w Obsidianie → wiersze w aplikacji: przepisy, osoby i protokoły (notatki mają osobną ścieżkę).
// Czyste funkcje: z treści pliku i jego nazwy budują wartości do wstawienia. Braki uzupełniamy z nazwy pliku, a wartości
// spoza dozwolonych (kategoria, data) zastępujemy bezpiecznymi domyślnymi, żeby jeden błędny plik nie zatrzymał synchronizacji.

import { RECIPE_CATEGORIES } from "@/types/recipes";
import { personFromMarkdown, recipeFromMarkdown, reportFromMarkdown } from "@/lib/obsidian/markdown";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_RECIPE_CATEGORY = "danie główne";

/** Typy plików importowane tą ścieżką (notatki: lib/obsidian/runSync.ts). */
export type ImportableType = "recipe" | "person" | "report";

export type ImportValues = Record<string, unknown>;

const clip = (value: string | null | undefined, max: number): string => (value ?? "").trim().slice(0, max);
const validDate = (value: unknown): string | null =>
  typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : null;

export function recipeValues(content: string, fileName: string): ImportValues {
  const parsed = recipeFromMarkdown(content, fileName);
  const category = (RECIPE_CATEGORIES as readonly string[]).includes(parsed.category ?? "")
    ? parsed.category
    : DEFAULT_RECIPE_CATEGORY;
  return {
    name: clip(parsed.name, 200) || clip(fileName, 200) || "Przepis",
    category,
    products: parsed.products ?? [],
    description: parsed.description ? parsed.description : null,
  };
}

/** „Jan Kowalski” → imię i nazwisko (pierwsze słowo = imię); używane, gdy plik nie ma ich w nagłówku. */
function namesFromFileName(fileName: string): { first: string; last: string } {
  const [first = "", ...rest] = fileName.trim().split(/\s+/);
  return { first, last: rest.join(" ") };
}

export function personValues(content: string, fileName: string): ImportValues {
  const parsed = personFromMarkdown(content);
  const fromName = namesFromFileName(fileName);
  const firstName = clip(parsed.first_name, 100) || fromName.first || "Bez imienia";
  const lastName = parsed.first_name ? clip(parsed.last_name, 100) : clip(parsed.last_name, 100) || fromName.last;
  return {
    first_name: firstName,
    last_name: lastName,
    relationship: parsed.relationship ? clip(parsed.relationship, 100) : null,
    priority: typeof parsed.priority === "number" ? Math.min(5, Math.max(0, Math.round(parsed.priority))) : 0,
    birthday: validDate(parsed.birthday),
    nameday: validDate(parsed.nameday),
    phones: parsed.phones ?? [],
    emails: parsed.emails ?? [],
    last_contact_date: parsed.last_contact_date ? parsed.last_contact_date : null,
    notes: parsed.notes ? parsed.notes : null,
  };
}

/** „2026-11-02 Zebranie zarządu” → data i temat; używane, gdy plik nie ma ich w nagłówku. */
function reportFromFileName(fileName: string): { date: string | null; topic: string } {
  const trimmed = fileName.trim();
  const dateMatch = /^\d{4}-\d{2}-\d{2}(?=\s)/.exec(trimmed);
  const topic = dateMatch ? trimmed.slice(dateMatch[0].length).trim() : "";
  return dateMatch && topic !== "" ? { date: validDate(dateMatch[0]), topic } : { date: null, topic: trimmed };
}

export function reportValues(content: string, fileName: string, today: string): ImportValues {
  const parsed = reportFromMarkdown(content);
  const fromName = reportFromFileName(fileName);
  return {
    topic: clip(parsed.topic, 300) || clip(fromName.topic, 300) || "Protokół",
    date: validDate(parsed.date) ?? fromName.date ?? today,
    participants: parsed.participants ?? [],
    agenda: parsed.agenda ?? [],
    tasks: parsed.tasks ?? [],
    notes: parsed.notes ? parsed.notes : null,
  };
}

export function importValues(type: ImportableType, content: string, fileName: string, today: string): ImportValues {
  if (type === "recipe") return recipeValues(content, fileName);
  if (type === "person") return personValues(content, fileName);
  return reportValues(content, fileName, today);
}
