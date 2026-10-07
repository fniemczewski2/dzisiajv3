// hooks/db/useRecipes.ts

import { useEffect, useState, useMemo, useCallback } from "react";
import type { NewRecipe, Recipe } from "@/types/recipes";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "./useSettings";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useAbortController } from "@/hooks/useAbortController";
import { isAbortError } from "@/lib/abortUtils";
import { collectProducts, normalizeRecipe, sortRecipes } from "@/lib/recipeUtils";
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
    prepareInsert: (r, uId) => {
      const clean = normalizeRecipe(r);
      return {
        user_id: uId,
        name: clean.name,
        category: clean.category,
        products: clean.products,
        description: clean.description,
      };
    },
    buildOptimistic: (r, tempId, uId) => ({
      ...normalizeRecipe(r),
      id: tempId,
      user_id: uId,
      created_at: new Date().toISOString(),
    }),
    applyServerRowOnEdit: true,
    messages: MESSAGES,
  });

  const [productDictionary, setProductDictionary] = useState<string[]>([]);

  const recipes = useMemo(
    () => sortRecipes(crud.items, settings?.sort_recipes),
    [crud.items, settings?.sort_recipes]
  );

  const products = useMemo(
    () => collectProducts(productDictionary, crud.items),
    [productDictionary, crud.items]
  );

  const fetchProducts = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];
    const signal = getProductsSignal();
    try {
      const { data, error } = await withRetry(
        () =>
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

  const addRecipe = useCallback(
    (recipe: NewRecipe): Promise<Recipe | undefined> => crud.add(recipe),
    [crud]
  );

  const editRecipe = useCallback(
    (recipe: Recipe): Promise<Recipe | undefined> => {
      const clean = normalizeRecipe(recipe);
      return crud.patch(recipe.id, {
        name: clean.name,
        category: clean.category,
        products: clean.products,
        description: clean.description,
      });
    },
    [crud]
  );

  const deleteRecipe = useCallback(
    (id: string): Promise<boolean> => crud.remove(id),
    [crud]
  );

  const refresh = useCallback(async () => {
    const [p] = await Promise.all([fetchProducts(), crud.refetch()]);
    setProductDictionary(p);
  }, [fetchProducts, crud]);

  useEffect(() => {
    let cancelled = false;
    void fetchProducts().then((p) => {
      if (!cancelled) setProductDictionary(p);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

  return {
    recipes,
    products,
    loading: crud.loading,
    fetching: crud.fetching,
    refresh,
    addRecipe,
    editRecipe,
    deleteRecipe,
  };
}

export type UseRecipesResult = ReturnType<typeof useRecipes>;
