// hooks/useRecipes.ts
"use client";
import { useEffect, useState, useMemo } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Recipe, RecipeCategory, Product, RecipeInsert } from "../types";

type NewRecipe = {
  name: string;
  category: RecipeCategory;
  products: string[];
  description: string;
};

type UseRecipes = {
  recipes: Recipe[];
  products: string[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  addRecipe: (r: NewRecipe) => Promise<Recipe | null>;
  editRecipe: (recipe: Recipe) => Promise<Recipe | null>;
  deleteRecipe: (id: string) => Promise<void>;
  suggestProducts: (q: string) => string[];
};

export function useRecipes(): UseRecipes {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchRecipes = async (email: string) => {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Recipe[];
  };

  const fetchProducts = async (email: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("name")
      .eq("user_email", email)
      .order("name", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as { name: string }[];
    return rows.map((p) => p.name);
  };

  const refresh = async () => {
    if (!userEmail) return;

    setLoading(true);
    setError(undefined);
    try {
      const [r, p] = await Promise.all([
        fetchRecipes(userEmail),
        fetchProducts(userEmail),
      ]);
      setRecipes(r);
      setProducts(p);
    } catch (e: any) {
      setError(e?.message || "Błąd podczas ładowania danych.");
    } finally {
      setLoading(false);
    }
  };

  const addRecipe = async (r: NewRecipe): Promise<Recipe | null> => {
    if (!userEmail) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .insert({
          user_email: userEmail,
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
    } catch (e: any) {
      setError(e?.message || "Błąd podczas dodawania przepisu.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const editRecipe = async (recipe: Recipe): Promise<Recipe | null> => {
    if (!userEmail) return null;

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

      const updatedRecipe = data as Recipe;
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipe.id ? updatedRecipe : r))
      );
      return updatedRecipe;
    } catch (e: any) {
      setError(e?.message || "Błąd podczas edycji przepisu.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!userEmail) return;

    setLoading(true);
    try {
      await supabase.from("recipes").delete().eq("id", id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message || "Błąd podczas usuwania przepisu.");
    } finally {
      setLoading(false);
    }
  };

  const suggestProducts = useMemo(() => {
    return (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      return products.filter((p) => p.toLowerCase().includes(q)).slice(0, 5);
    };
  }, [products]);

  useEffect(() => {
    refresh();
  }, [userEmail]);

  return {
    recipes,
    products,
    loading,
    error,
    refresh,
    addRecipe,
    editRecipe,
    deleteRecipe,
    suggestProducts,
  };
}