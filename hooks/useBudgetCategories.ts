// hooks/useBudgetCategories.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";
import type { BudgetCategory } from "../types";

const MAX_CATEGORIES = 10;

export function useBudgetCategories(year: number) {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchCategories = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setCategories((data ?? []) as BudgetCategory[]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, year]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  const addCategory = useCallback(
    async (payload: {
      name: string;
      amount: number;
      is_monthly: boolean;
    }): Promise<BudgetCategory> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      if (categories.length >= MAX_CATEGORIES) {
        throw new Error(`Maksymalnie ${MAX_CATEGORIES} kategorii budżetu`);
      }
      setSaving(true);
      try {
        const { data, error } = await supabase
          .from("budget_categories")
          .insert({
            user_id:    userId,
            year,
            name:       payload.name.trim(),
            amount:     payload.amount,
            is_monthly: payload.is_monthly,
            sort_order: categories.length,
          })
          .select()
          .single();

        if (error) throw error;
        const cat = data as BudgetCategory;
        setCategories((prev) => [...prev, cat]);
        return cat;
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId, year, categories.length]
  );
  const updateCategory = useCallback(
    async (
      id: string,
      updates: Partial<Pick<BudgetCategory, "name" | "amount" | "is_monthly" | "sort_order">>
    ): Promise<void> => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from("budget_categories")
          .update(updates)
          .eq("id", id)
          .eq("user_id", userId ?? "");

        if (error) throw error;
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from("budget_categories")
          .delete()
          .eq("id", id)
          .eq("user_id", userId ?? "");

        if (error) throw error;
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId]
  );

  const reorderCategories = useCallback(
    async (reordered: BudgetCategory[]): Promise<void> => {
      setCategories(reordered); 
      setSaving(true);
      try {
        await Promise.all(
          reordered.map((cat, idx) =>
            supabase
              .from("budget_categories")
              .update({ sort_order: idx })
              .eq("id", cat.id)
              .eq("user_id", userId ?? "")
          )
        );
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId]
  );

  const seedDefaults = useCallback(
    async (
      defaults: Array<{ name: string; amount: number; is_monthly: boolean }>
    ): Promise<void> => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setSaving(true);
      try {
        const rows = defaults.map((d, i) => ({
          user_id:    userId,
          year,
          name:       d.name,
          amount:     d.amount,
          is_monthly: d.is_monthly,
          sort_order: i,
        }));

        const { data, error } = await supabase
          .from("budget_categories")
          .upsert(rows, { onConflict: "user_id,year,name" })
          .select();

        if (error) throw error;
        setCategories((data ?? []) as BudgetCategory[]);
      } finally {
        setSaving(false);
      }
    },
    [supabase, userId, year]
  );

  return {
    categories,
    loading,
    saving,
    maxReached: categories.length >= MAX_CATEGORIES,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    seedDefaults,
  };
}