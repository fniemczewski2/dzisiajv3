// hooks/useBudgetCategories.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import type { BudgetCategory } from "@/types/bills";
import { MAX_CATEGORIES } from "@/config/limits";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

export function useBudgetCategories(year: number) {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const withRetry = useRetry();

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching && toast.loading) toastId = toast.loading("Ładowanie kategorii...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase
          .from("budget_categories")
          .select("*")
          .eq("user_id", userId)
          .eq("year", year)
          .order("sort_order", { ascending: true })
      );

      if (error) throw error;
      setCategories((data ?? []) as BudgetCategory[]);
    } catch {
      toast.error("Błąd pobierania kategorii.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, year, toast, withRetry]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const addCategory = useCallback(
    async (payload: { name: string; monthly_amounts: number[]; is_monthly: boolean }): Promise<BudgetCategory | undefined> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
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
        const { data, error } = await withRetry(async () =>
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
    [supabase, userId, year, categories.length, toast, withRetry]
  );

  const updateCategory = useCallback(
    async (
      id: string,
      updates: Partial<Pick<BudgetCategory, "name" | "monthly_amounts" | "is_monthly" | "sort_order">>
    ): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = categories;
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

      try {
        const { error } = await withRetry(async () =>
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
    [supabase, userId, categories, toast, withRetry]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć kategorię?`);
      if (!ok) return;
      setLoading(true);
      const previous = categories;
      setCategories((prev) => prev.filter((c) => c.id !== id));

      try {
        const { error } = await withRetry(async () =>
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
    [supabase, userId, categories, toast, withRetry]
  );

  const reorderCategories = useCallback(
    async (reordered: BudgetCategory[]): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const previous = categories;
      setCategories(reordered);
      setLoading(true);

      try {
        const results = await withRetry(async () =>
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
    [supabase, userId, categories, toast, withRetry]
  );

  const seedDefaults = useCallback(
    async (defaults: Array<{ name: string; monthly_amounts: number[]; is_monthly: boolean }>): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
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

        const { data, error } = await withRetry(async () =>
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
    [supabase, userId, year, toast, withRetry]
  );

  return {
    categories,
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
