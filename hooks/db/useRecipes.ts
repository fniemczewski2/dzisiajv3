"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { NewRecipe, Recipe } from "@/types/recipes";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "./useSettings";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";

export function useRecipes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawRecipes, setRawRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const withRetry = useRetry();


  const recipes = useMemo(() => {
    if (!settings) return rawRecipes;
    const sorted = [...rawRecipes];
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
  }, [rawRecipes, settings?.sort_recipes]);

  const fetchRecipes = useCallback(async (): Promise<Recipe[]> => {
    if (!userId) {

      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("recipes").select("*").eq("user_id", userId)
      );
      if (error) throw error;
      return (data || []) as Recipe[];
    } catch {
      toast.error("Błąd pobierania przepisów.");
      return [];
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast, withRetry]);

  const fetchProducts = useCallback(async (): Promise<string[]> => {
    if (!userId) {

      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("products").select("name").eq("user_id", userId).order("name", { ascending: true })
      );
      if (error) throw error;
      return ((data ?? []) as { name: string }[]).map((p) => p.name);
    } catch {
      toast.error("Błąd pobierania produktów.");
      return [];
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast, withRetry]);

  const refresh = useCallback(async () => {
    const [r, p] = await Promise.all([fetchRecipes(), fetchProducts()]);
    setRawRecipes(r);
    setProducts(p);
  }, [fetchRecipes, fetchProducts]);

  const addRecipe = useCallback(
    async (r: NewRecipe): Promise<Recipe | undefined> => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticRecipe = { ...r, id: tempId, user_id: userId } as Recipe;
      setRawRecipes((prev) => [optimisticRecipe, ...prev]);

      try {
        const { data, error } = await withRetry(async () =>
          supabase
            .from("recipes")
            .insert({
              user_id: userId,
              name: r.name,
              category: r.category,
              products: r.products,
              description: r.description,
            })
            .select()
            .single()
        );
        if (error) throw error;
        const newRecipe = data as Recipe;
        setRawRecipes((prev) => prev.map((rec) => (rec.id === tempId ? newRecipe : rec)));
        toast.success("Dodano przepis");
        return newRecipe;
      } catch {
        setRawRecipes((prev) => prev.filter((rec) => rec.id !== tempId));
        toast.error("Błąd dodawania przepisu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const editRecipe = useCallback(
    async (recipe: Recipe): Promise<Recipe | undefined> => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = rawRecipes;
      setRawRecipes((prev) => prev.map((r) => (r.id === recipe.id ? recipe : r)));

      try {
        const { data, error } = await withRetry(async () =>
          supabase
            .from("recipes")
            .update({
              name: recipe.name,
              category: recipe.category,
              products: recipe.products,
              description: recipe.description,
            })
            .eq("id", recipe.id)
            .select()
            .single()
        );
        if (error) throw error;
        const updated = data as Recipe;
        setRawRecipes((prev) => prev.map((r) => (r.id === recipe.id ? updated : r)));
        toast.success("Zaktualizowano przepis");
        return updated;
      } catch {
        setRawRecipes(previous);
        toast.error("Błąd aktualizacji przepisu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, rawRecipes, toast, withRetry]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć przepis?`);
      if (!ok) return;
      setLoading(true);
      const previous = rawRecipes;
      setRawRecipes((prev) => prev.filter((r) => r.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("recipes").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto przepis");
      } catch {
        setRawRecipes(previous);
        toast.error("Błąd usuwania przepisu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, rawRecipes, toast, withRetry]
  );

  const suggestProducts = useMemo(
    () => (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      return products.filter((p) => p.toLowerCase().includes(q)).slice(0, 5);
    },
    [products]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    recipes,
    products,
    loading,
    fetching,
    refresh,
    addRecipe,
    editRecipe,
    deleteRecipe,
    suggestProducts,
  };
}
