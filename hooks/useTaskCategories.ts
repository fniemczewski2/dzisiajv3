// hooks/useTaskCategories.ts
//
// Kategorie zadań i ich kolory – z ustawień użytkownika (SettingsProvider),
// więc zmiana w Ustawieniach jest od razu widoczna w formularzach i na liście.

import { useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSettings } from "@/hooks/db/useSettings";
import { DEFAULT_USER_TASK_CATEGORIES, resolveUserTaskCategories } from "@/lib/taskCategories";

const NO_COLORS: Readonly<Record<string, string>> = Object.freeze({});

export function useTaskCategories(): string[] {
  const categories = useSettings().settings.task_categories;
  // Przed wczytaniem i przy braku ustawienia – kategorie domyślne.
  return useMemo(
    () => (categories ? resolveUserTaskCategories(categories) : [...DEFAULT_USER_TASK_CATEGORIES]),
    [categories]
  );
}

/** Kolory kategorii (nazwa → kolor z palety). Pusta mapa = brak kolorów. */
export function useCategoryColors(): Record<string, string> {
  return useSettings().settings.category_colors ?? NO_COLORS;
}

/**
 * Po zmianie nazwy kategorii w Ustawieniach przenosi zadania (i wydarzenia) użytkownika ze
 * starej nazwy na nową – inaczej zostałyby w kategorii, której nie ma już na liście.
 */
export async function applyTaskCategoryRenames(
  supabase: SupabaseClient,
  userId: string,
  renames: ReadonlyArray<readonly [from: string, to: string]>
): Promise<{ failed: number }> {
  // Wydarzenia też mają kategorię – przenosimy je razem z zadaniami, żeby nie straciły koloru.
  const results = await Promise.all(
    renames.flatMap(([from, to]) => [
      supabase.from("tasks").update({ category: to }).eq("user_id", userId).eq("category", from),
      supabase.from("events").update({ category: to }).eq("user_id", userId).eq("category", from),
    ])
  );
  return { failed: results.filter((r) => r.error).length };
}
