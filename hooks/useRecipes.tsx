"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Recipe, RecipeCategory, Product } from "../types";

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
  addRecipe: (r: NewRecipe, userEmail: string) => Promise<Recipe | null>;
  suggestProducts: (q: string) => string[];
};

export function useRecipes(userEmail?: string): UseRecipes {
  const supabase = useSupabaseClient();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();

  const fetchRecipes = useCallback(async (email: string) => {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Recipe[];
  }, []);

  const fetchProducts = useCallback(async (email: string) => {
    const { data, error } = await supabase
        .from("products")
        .select("name")
        .eq("user_email", email)
        .order("name", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as { name: string }[];
    return rows.map((p) => p.name);
    }, []);

  const refresh = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setErr(undefined);
    try {
      const [r, p] = await Promise.all([
        fetchRecipes(userEmail),
        fetchProducts(userEmail),
      ]);
      setRecipes(r);
      setProducts(p);
    } catch (e: any) {
      setErr(e?.message || "Błąd podczas ładowania danych.");
    } finally {
      setLoading(false);
    }
  }, [userEmail, fetchRecipes, fetchProducts]);

  useEffect(() => { void refresh(); }, [refresh]);

  const upsertProducts = useCallback(async (names: string[], email: string) => {
    if (!names.length) return;
    const uniq = Array.from(new Set(names.map(n => n.trim()))).filter(Boolean);
    const rows = uniq.map((name) => ({ name, user_email: email }));
    const { error } = await supabase
      .from("products")
      .upsert(rows, { onConflict: "user_email,name", ignoreDuplicates: true });
    if (error) throw error;
    // lokalnie scal listę (bez dodatkowego round-trip)
    setProducts(prev => Array.from(new Set([...prev, ...uniq])).sort());
  }, []);

  const addRecipe = useCallback(async (r: NewRecipe, email: string) => {
    try {
      await upsertProducts(r.products, email);
      const payload: Recipe = {
        name: r.name.trim(),
        category: r.category,
        products: Array.from(new Set(r.products.map(p => p.trim()))),
        description: r.description.trim(),
        user_email: email,
      };
      const { data, error } = await supabase
        .from("recipes")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      const saved = data as Recipe;
      setRecipes(prev => [saved, ...prev]);
      return saved;
    } catch (e) {
      setErr((e as any)?.message || "Nie udało się dodać przepisu.");
      return null;
    }
  }, [upsertProducts]);

  const suggestProducts = useCallback((q: string) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return products.filter(p => p.toLowerCase().includes(needle)).slice(0, 7);
  }, [products]);

  return {
    recipes,
    products,
    loading,
    error: err,
    refresh,
    addRecipe,
    suggestProducts,
  };
}
