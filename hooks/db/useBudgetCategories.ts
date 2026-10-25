// hooks/db/useBudgetCategories.ts

import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import type { BudgetCategory } from "@/types/bills";
import { MAX_CATEGORIES } from "@/config/limits";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";

const NO_CATEGORIES: BudgetCategory[] = [];

export function useBudgetCategories(year: number) {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const withRetry = useRetry();

  const queryCategories = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<BudgetCategory[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("budget_categories")
              .select("*")
              .eq("user_id", userId)
              .eq("year", year)
              .order("sort_order", { ascending: true })
              .abortSignal(signal),
          signal
        );
        if (error) throw error;
        return (data ?? []) as BudgetCategory[];
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania kategorii.", { cause: err });
        throw err;
      }
    },
    [supabase, userId, year, toast, withRetry]
  );
  // Bez zalogowanego użytkownika zapytanie jest wyłączone (wczytywanie sesji, wylogowanie).
  const {
    data: categories,
    setData: setCategories,
    fetching,
    refetch: fetchCategories,
  } = useQueryState<BudgetCategory[]>({
    queryKey: ["budget-categories", userId ?? null, year],
    queryFn: queryCategories,
    initial: NO_CATEGORIES,
    enabled: Boolean(userId),
  });

  const addCategory = useCallback(
    async (payload: {
      name: string;
      monthly_amounts: number[];
      is_monthly: boolean;
    }): Promise<BudgetCategory | undefined> => {
      if (!userId) {
        throw new NotSignedInError();
      }
      if (categories.length >= MAX_CATEGORIES) {
        toast.error(`Maksymalnie ${MAX_CATEGORIES} kategorii budżetu.`);
        return;
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticCategory = {
        id: tempId,
        user_id: userId,
        year,
        name: payload.name.trim(),
        monthly_amounts: payload.monthly_amounts,
        is_monthly: payload.is_monthly,
        sort_order: categories.length,
      } as BudgetCategory;
      setCategories((prev) => [...prev, optimisticCategory]);

      try {
        const { data, error } = await withRetry(() =>
          supabase
            .from("budget_categories")
            .insert({
              user_id: userId,
              year,
              name: payload.name.trim(),
              monthly_amounts: payload.monthly_amounts,
              is_monthly: payload.is_monthly,
              sort_order: categories.length,
            })
            .select()
            .single()
        );

        if (error) throw error;
        const cat = data as BudgetCategory;
        setCategories((prev) => prev.map((c) => (c.id === tempId ? cat : c)));
        toast.success("Dodano kategorię");
        return cat;
      } catch {
        setCategories((prev) => prev.filter((c) => c.id !== tempId));
        toast.error("Błąd dodawania kategorii.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, year, categories.length, toast, withRetry, setCategories]
  );

  const updateCategory = useCallback(
    async (
      id: string,
      updates: Partial<Pick<BudgetCategory, "name" | "monthly_amounts" | "is_monthly" | "sort_order">>
    ): Promise<void> => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const previous = categories;
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

      try {
        const { error } = await withRetry(() =>
          supabase.from("budget_categories").update(updates).eq("id", id).eq("user_id", userId)
        );
        if (error) throw error;
        toast.success("Zaktualizowano kategorię");
      } catch {
        setCategories(previous);
        toast.error("Błąd aktualizacji kategorii.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, categories, toast, withRetry, setCategories]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
        throw new NotSignedInError();
      }
      const ok = await toast.confirm(`Czy chcesz usunąć kategorię?`);
      if (!ok) return;
      setLoading(true);
      const previous = categories;
      setCategories((prev) => prev.filter((c) => c.id !== id));

      try {
        const { error } = await withRetry(() =>
          supabase.from("budget_categories").delete().eq("id", id).eq("user_id", userId)
        );
        if (error) throw error;
        toast.success("Usunięto kategorię");
      } catch {
        setCategories(previous);
        toast.error("Błąd usuwania kategorii.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, categories, toast, withRetry, setCategories]
  );

  const reorderCategories = useCallback(
    async (reordered: BudgetCategory[]): Promise<void> => {
      if (!userId) {
        throw new NotSignedInError();
      }
      const previous = categories;
      setCategories(reordered);
      setLoading(true);

      try {
        const results = await withRetry(() =>
          Promise.all(
            reordered.map((cat, idx) =>
              supabase.from("budget_categories").update({ sort_order: idx }).eq("id", cat.id).eq("user_id", userId)
            )
          )
        );
        const firstError = results.find((r) => r.error)?.error;
        if (firstError) throw firstError;
        toast.success("Zmieniono kolejność kategorii");
      } catch {
        setCategories(previous);
        toast.error("Błąd zmiany kolejności kategorii.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, categories, toast, withRetry, setCategories]
  );

  const seedDefaults = useCallback(
    async (defaults: Array<{ name: string; monthly_amounts: number[]; is_monthly: boolean }>): Promise<void> => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      try {
        const rows = defaults.map((d, i) => ({
          user_id: userId,
          year,
          name: d.name,
          monthly_amounts: d.monthly_amounts,
          is_monthly: d.is_monthly,
          sort_order: i,
        }));

        const { data, error } = await withRetry(() =>
          supabase.from("budget_categories").upsert(rows, { onConflict: "user_id,year,name" }).select()
        );

        if (error) throw error;
        setCategories((data ?? []) as BudgetCategory[]);
        toast.success("Wczytano domyślne kategorie");
      } catch {
        toast.error("Błąd wczytywania domyślnych kategorii.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, year, toast, withRetry, setCategories]
  );

  /**
   * Kopiuje kategorie (nazwy, limity, kolejność) z innego roku. Kategorie
   * o tej samej nazwie, które już są w bieżącym roku, zostają bez zmian.
   */
  const importFromYear = useCallback(
    async (sourceYear: number): Promise<number> => {
      if (!userId) return 0;
      setLoading(true);
      try {
        const { data: source, error: readError } = await supabase
          .from("budget_categories")
          .select("name, monthly_amounts, is_monthly, sort_order")
          .eq("user_id", userId)
          .eq("year", sourceYear)
          .order("sort_order", { ascending: true });
        if (readError) throw readError;
        if (!source || source.length === 0) {
          toast.error(`Brak kategorii w roku ${sourceYear}.`);
          return 0;
        }
        const offset = categories.length;
        const rows = (
          source as Array<Pick<BudgetCategory, "name" | "monthly_amounts" | "is_monthly" | "sort_order">>
        ).map((c, i) => ({
          user_id: userId,
          year,
          name: c.name,
          monthly_amounts: c.monthly_amounts,
          is_monthly: c.is_monthly,
          sort_order: offset + i,
        }));
        const { data, error } = await supabase
          .from("budget_categories")
          .upsert(rows, { onConflict: "user_id,year,name", ignoreDuplicates: true })
          .select();
        if (error) throw error;
        await fetchCategories();
        const added = data?.length ?? 0;
        toast.success(added ? `Zaimportowano kategorie: ${added}.` : "Wszystkie kategorie już są w tym roku.");
        return added;
      } catch {
        toast.error("Nie udało się zaimportować kategorii.");
        return 0;
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, year, categories.length, toast, fetchCategories]
  );

  return {
    importFromYear,
    categories,
    fetching,
    loading,
    maxReached: categories.length >= MAX_CATEGORIES,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    seedDefaults,
  };
}
