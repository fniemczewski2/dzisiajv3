// hooks/useTaskCategories.ts
//
// Kategorie zadań użytkownika. Używane w formularzu zadania i w edycji każdego
// zadania, więc pobieramy je raz na sesję (wspólny cache), a zmiany zapisane
// w Ustawieniach odbieramy ze zdarzenia „settingsUpdated”.

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/providers/AuthProvider";
import { DEFAULT_USER_TASK_CATEGORIES, resolveUserTaskCategories } from "@/lib/taskCategories";

type Stored = string[] | null;
let cache: { userId: string; promise: Promise<Stored> } | null = null;

function load(supabase: SupabaseClient, userId: string): Promise<Stored> {
  if (cache?.userId !== userId) {
    cache = {
      userId,
      promise: Promise.resolve(
        supabase.from("settings").select("task_categories").eq("user_id", userId).maybeSingle()
      ).then(({ data, error }) => (error ? null : ((data?.task_categories as Stored) ?? null))),
    };
  }
  return cache.promise;
}

/** Tylko do testów. */
export function resetTaskCategoriesCache(): void {
  cache = null;
}

export function useTaskCategories(): string[] {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [categories, setCategories] = useState<string[]>(() => [...DEFAULT_USER_TASK_CATEGORIES]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void load(supabase, userId).then((stored) => {
      if (!cancelled) setCategories(resolveUserTaskCategories(stored));
    });

    const onSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ task_categories?: Stored }>).detail;
      if (!detail || !("task_categories" in detail)) return;
      const stored = detail.task_categories ?? null;
      cache = { userId, promise: Promise.resolve(stored) };
      setCategories(resolveUserTaskCategories(stored));
    };
    globalThis.addEventListener("settingsUpdated", onSettingsUpdated);
    return () => {
      cancelled = true;
      globalThis.removeEventListener("settingsUpdated", onSettingsUpdated);
    };
  }, [supabase, userId]);

  return categories;
}

/**
 * Po zmianie nazwy kategorii w Ustawieniach przenosi zadania użytkownika ze
 * starej nazwy na nową – inaczej zostałyby w kategorii, której nie ma już na liście.
 */
export async function applyTaskCategoryRenames(
  supabase: SupabaseClient,
  userId: string,
  renames: ReadonlyArray<readonly [from: string, to: string]>
): Promise<{ failed: number }> {
  const results = await Promise.all(
    renames.map(([from, to]) =>
      supabase.from("tasks").update({ category: to }).eq("user_id", userId).eq("category", from)
    )
  );
  return { failed: results.filter((r) => r.error).length };
}
