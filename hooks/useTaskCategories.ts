// hooks/useTaskCategories.ts
//
// Kategorie zadań użytkownika. Używane w formularzu zadania i w edycji każdego
// zadania, więc pobieramy je raz na sesję (wspólny cache), a zmiany zapisane
// w Ustawieniach odbieramy ze zdarzenia „settingsUpdated”.

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/providers/AuthProvider";
import { DEFAULT_USER_TASK_CATEGORIES, resolveUserTaskCategories } from "@/lib/taskCategories";
import { normalizeCategoryColors } from "@/lib/categoryColors";

type Stored = { categories: string[] | null; colors: Record<string, string> };
let cache: { userId: string; promise: Promise<Stored> } | null = null;

const EMPTY: Stored = { categories: null, colors: {} };

async function fetchStored(supabase: SupabaseClient, userId: string): Promise<Stored> {
  const full = await supabase.from("settings").select("task_categories, category_colors").eq("user_id", userId).maybeSingle();
  if (!full.error) {
    return {
      categories: Array.isArray(full.data?.task_categories) ? (full.data.task_categories as string[]) : null,
      colors: normalizeCategoryColors(full.data?.category_colors),
    };
  }
  // Baza bez kolumny category_colors (kod wdrożony przed migracją) – same kategorie.
  const basic = await supabase.from("settings").select("task_categories").eq("user_id", userId).maybeSingle();
  if (basic.error) return EMPTY;
  return { categories: Array.isArray(basic.data?.task_categories) ? (basic.data.task_categories as string[]) : null, colors: {} };
}

function load(supabase: SupabaseClient, userId: string): Promise<Stored> {
  if (cache?.userId !== userId) {
    cache = { userId, promise: fetchStored(supabase, userId) };
  }
  return cache.promise;
}

/** Tylko do testów. */
export function resetTaskCategoriesCache(): void {
  cache = null;
}

function useStoredCategories(): Stored {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [stored, setStored] = useState<Stored>(EMPTY);

  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    void load(supabase, userId).then((value) => {
      if (!cancelled) setStored(value);
    });

    const onSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ task_categories?: string[] | null; category_colors?: unknown }>).detail;
      if (!detail || !("task_categories" in detail || "category_colors" in detail)) return;
      setStored((prev) => {
        const next: Stored = {
          categories: "task_categories" in detail ? detail.task_categories ?? null : prev.categories,
          colors: "category_colors" in detail ? normalizeCategoryColors(detail.category_colors) : prev.colors,
        };
        cache = { userId, promise: Promise.resolve(next) };
        return next;
      });
    };
    globalThis.addEventListener("settingsUpdated", onSettingsUpdated);
    return () => {
      cancelled = true;
      globalThis.removeEventListener("settingsUpdated", onSettingsUpdated);
    };
  }, [supabase, userId]);

  return stored;
}

export function useTaskCategories(): string[] {
  const { categories } = useStoredCategories();
  // Przed wczytaniem i przy braku ustawienia – kategorie domyślne.
  return categories ? resolveUserTaskCategories(categories) : [...DEFAULT_USER_TASK_CATEGORIES];
}

/** Kolory kategorii (nazwa → kolor z palety). Pusta mapa = brak kolorów. */
export function useCategoryColors(): Record<string, string> {
  return useStoredCategories().colors;
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
