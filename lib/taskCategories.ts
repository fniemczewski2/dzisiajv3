// lib/taskCategories.ts
//
// Kategorie zadań: użytkownik ustala własną listę w Ustawieniach (kolumna
// settings.task_categories). Kategorie systemowe mają przypisane działanie
// i są zawsze dostępne, ale nie da się ich usunąć ani zmienić ich nazwy.

import { TASK_CATEGORIES, DEFAULT_TASK_CATEGORY, RECURRING_TASK_CATEGORY, MEETING_POLL_TASK_CATEGORY } from "@/config/tasks";
import { SLACK_TASK_CATEGORY } from "@/config/slack";

/** Kategorie z logiką w aplikacji: powtarzanie, synchronizacja ze Slackiem, ankiety terminów. */
export const SYSTEM_TASK_CATEGORIES: readonly string[] = [RECURRING_TASK_CATEGORY, SLACK_TASK_CATEGORY, MEETING_POLL_TASK_CATEGORY];

/** Domyślna lista użytkownika = dotychczasowe kategorie bez systemowych. */
export const DEFAULT_USER_TASK_CATEGORIES: readonly string[] = TASK_CATEGORIES.filter(
  (c) => !SYSTEM_TASK_CATEGORIES.includes(c)
);

export const MAX_TASK_CATEGORIES = 20;
export const MAX_TASK_CATEGORY_LENGTH = 30;

const sameName = (a: string, b: string) => a.localeCompare(b, "pl", { sensitivity: "base" }) === 0;

export function isSystemTaskCategory(name: string): boolean {
  return SYSTEM_TASK_CATEGORIES.some((c) => sameName(c, name));
}

/** Lista użytkownika; brak ustawienia (null) albo pusta lista = kategorie domyślne. */
export function resolveUserTaskCategories(stored: readonly string[] | null | undefined): string[] {
  const cleaned = (stored ?? []).map(normalizeTaskCategoryName).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [...DEFAULT_USER_TASK_CATEGORIES];
}

/**
 * Opcje pola „Kategoria”: kategorie użytkownika, potem systemowe. Jeśli zadanie
 * ma kategorię spoza listy (np. usuniętą w ustawieniach), też jest na liście –
 * inaczej zapis edycji po cichu by ją zmienił.
 */
export function taskCategoryOptions(userCategories: readonly string[], current?: string | null): string[] {
  const options = [...userCategories, ...SYSTEM_TASK_CATEGORIES.filter((s) => !userCategories.includes(s))];
  if (current && !options.includes(current)) options.push(current);
  return options;
}

/** Kategoria nowego zadania: „inne”, jeśli użytkownik ją ma, inaczej pierwsza z jego listy. */
export function defaultTaskCategory(userCategories: readonly string[]): string {
  return userCategories.find((c) => sameName(c, DEFAULT_TASK_CATEGORY)) ?? userCategories[0] ?? DEFAULT_TASK_CATEGORY;
}

export function normalizeTaskCategoryName(raw: string): string {
  return raw.replaceAll(/\s+/g, " ").trim();
}

/** Komunikat błędu albo null, gdy nazwa jest poprawna. `others` = pozostałe kategorie użytkownika. */
export function validateTaskCategoryName(raw: string, others: readonly string[]): string | null {
  const name = normalizeTaskCategoryName(raw);
  if (!name) return "Nazwa kategorii nie może być pusta.";
  if (name.length > MAX_TASK_CATEGORY_LENGTH) return `Nazwa może mieć najwyżej ${MAX_TASK_CATEGORY_LENGTH} znaków.`;
  if (isSystemTaskCategory(name)) return `„${name}” to kategoria systemowa – jest dostępna zawsze.`;
  if (others.some((o) => sameName(o, name))) return `Kategoria „${name}” już istnieje.`;
  return null;
}
