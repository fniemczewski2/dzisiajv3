"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { Recipe, RecipeCategory } from "../types";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "./useSettings";

type NewRecipe = {
  name: string;
  category: RecipeCategory;
  products: string[];
  description: string;
};

export function useRecipes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawRecipes, setRawRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

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
        (a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
    return sorted;
  }, [rawRecipes, settings?.sort_recipes]);

  const fetchRecipes = useCallback(async (): Promise<Recipe[]> => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return (data || []) as Recipe[];
    } catch {
      throw new Error("Wystąpił błąd pobierania przepisów.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId]);

  const fetchProducts = useCallback(async (): Promise<string[]> => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("name")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as { name: string }[]).map((p) => p.name);
    } catch {
      throw new Error("Wystąpił błąd pobierania");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId]);

  const refresh = useCallback(async () => {
    const [r, p] = await Promise.all([fetchRecipes(), fetchProducts()]);
    setRawRecipes(r);
    setProducts(p);
  }, [fetchRecipes, fetchProducts]);

  const addRecipe = async (r: NewRecipe): Promise<Recipe> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .insert({
          user_id: userId,
          name: r.name,
          category: r.category,
          products: r.products,
          description: r.description,
        })
        .select()
        .single();
      if (error) throw error;
      const newRecipe = data as Recipe;
      setRawRecipes((prev) => [newRecipe, ...prev]);
      return newRecipe;
    } finally {
      setLoading(false);
    }
  };

  const editRecipe = async (recipe: Recipe): Promise<Recipe> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .update({
          name: recipe.name,
          category: recipe.category,
          products: recipe.products,
          description: recipe.description,
        })
        .eq("id", recipe.id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as Recipe;
      setRawRecipes((prev) => prev.map((r) => (r.id === recipe.id ? updated : r)));
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
      setRawRecipes((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setLoading(false);
    }
  };

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