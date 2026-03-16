// hooks/useRecipes.ts

"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { Recipe, RecipeCategory } from "../types";
import { useAuth } from "../providers/AuthProvider";

type NewRecipe = {
  name: string;
  category: RecipeCategory;
  products: string[];
  description: string;
};

export function useRecipes() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecipes = useCallback(async (): Promise<Recipe[]> => {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as Recipe[];
  }, [supabase, userId]);

  const fetchProducts = useCallback(async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("name")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as { name: string }[]).map((p) => p.name);
  }, [supabase, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [r, p] = await Promise.all([fetchRecipes(), fetchProducts()]);
      setRecipes(r);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchRecipes, fetchProducts]);

  /** Throws on error — caller: withRetry + toast.success("Dodano pomyślnie.") */
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
      setRecipes((prev) => [newRecipe, ...prev]);
      return newRecipe;
    } finally {
      setLoading(false);
    }
  };

  /** Throws on error — caller: withRetry + toast.success("Zmieniono pomyślnie.") */
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
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? updated : r)));
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
      setRecipes((prev) => prev.filter((r) => r.id !== id));
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

  return { recipes, products, loading, refresh, addRecipe, editRecipe, deleteRecipe, suggestProducts };
}