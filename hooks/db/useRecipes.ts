// hooks/db/useRecipes.ts

import { useEffect, useState, useMemo, useCallback } from "react";
import type { NewRecipe, Recipe } from "@/types/recipes";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "./useSettings";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useAbortController } from "@/hooks/useAbortController";
import { isAbortError } from "@/lib/abortUtils";
import { useCrudResource } from "./useCrudResource";

const MESSAGES = {
  fetchError: "Błąd pobierania przepisów.",
  added: "Dodano przepis",
  addError: "Błąd dodawania przepisu.",
  edited: "Zaktualizowano przepis",
  editError: "Błąd aktualizacji przepisu.",
  deleted: "Usunięto przepis",
  deleteError: "Błąd usuwania przepisu.",
  confirmDelete: "Czy chcesz usunąć przepis?",
};

export function useRecipes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { toast } = useToast();
  const withRetry = useRetry();
  const { getSignal: getProductsSignal } = useAbortController();

  const crud = useCrudResource<Recipe, NewRecipe>({
    table: "recipes",
    insertPosition: "start",
    prepareInsert: (r, uId) => ({
      user_id: uId,
      name: r.name,
      category: r.category,
      products: r.products,
      description: r.description,
    }),
    applyServerRowOnEdit: true,
    messages: MESSAGES,
  });

  const [products, setProducts] = useState<string[]>([]);

  const recipes = useMemo(() => {
    if (!settings) return crud.items;
    const sorted = [...crud.items];
    if (settings.sort_recipes === "category") {
      sorted.sort((a, b) => {
        const catCompare = (a.category || "").localeCompare(b.category || "", "pl");
        if (catCompare !== 0) return catCompare;
        return (a.name || "").localeCompare(b.name || "", "pl");
      });
    } else if (settings.sort_recipes === "alphabetical") {
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pl"));
    } else {
      sorted.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
    return sorted;
  }, [crud.items, settings]);

  const fetchProducts = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];
    const signal = getProductsSignal();
    try {
      const { data, error } = await withRetry(
        async () =>
          supabase.from("products").select("name").eq("user_id", userId).order("name", { ascending: true }).abortSignal(signal),
        signal
      );
      if (error) throw error;
      return ((data ?? []) as { name: string }[]).map((p) => p.name);
    } catch (err) {
      if (isAbortError(err)) return [];
      toast.error("Błąd pobierania produktów.");
      return [];
    }
  }, [supabase, userId, toast, withRetry, getProductsSignal]);

  const editRecipe = useCallback(
    async (recipe: Recipe): Promise<Recipe | undefined> =>
      crud.patch(recipe.id, {
        name: recipe.name,
        category: recipe.category,
        products: recipe.products,
        description: recipe.description,
      }),
    [crud]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  const refresh = useCallback(async () => {
    const [p] = await Promise.all([fetchProducts(), crud.refetch()]);
    setProducts(p);
  }, [fetchProducts, crud]);

  const suggestProducts = useMemo(
    () => (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      return products.filter((p) => p.toLowerCase().includes(q)).slice(0, 5);
    },
    [products]
  );

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, [fetchProducts]);

  return {
    recipes,
    products,
    loading: crud.loading,
    fetching: crud.fetching,
    refresh,
    addRecipe: crud.add,
    editRecipe,
    deleteRecipe,
    suggestProducts,
  };
}
