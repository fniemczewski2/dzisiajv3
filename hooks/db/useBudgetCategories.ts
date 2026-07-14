// hooks/useBudgetCategories.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import type { BudgetCategory } from "@/types/bills";
import { MAX_CATEGORIES } from "@/config/limits";
import { useToast } from "@/providers/ToastProvider";

export function useBudgetCategories(year: number) {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie kategorii...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
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
      setFetching(false);
    }
  }, [supabase, userId, year]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  
  const addCategory = useCallback(
    async (payload: {
      name: string;
      monthly_amounts: number[];
      is_monthly: boolean;
    }): Promise<BudgetCategory> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      if (categories.length >= MAX_CATEGORIES) {
        throw new Error(`Maksymalnie ${MAX_CATEGORIES} kategorii budżetu`);
      }
      setLoading(true);
      try {
        
        const { data, error } = await supabase
          .from("budget_categories")
          .insert({
            user_id:    userId,
            year,
            name:       payload.name.trim(),
            monthly_amounts: payload.monthly_amounts,
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
        setLoading(false);
      }
    },
    [supabase, userId, year, categories.length]
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
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(
        `Czy chcesz usunąć kategorię?`
      );
      if (!ok) return;
      setLoading(true);
      try {
        const { error } = await supabase
          .from("budget_categories")
          .delete()
          .eq("id", id)
          .eq("user_id", userId ?? "");

        if (error) throw error;
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  const reorderCategories = useCallback(
    async (reordered: BudgetCategory[]): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setCategories(reordered); 
      setLoading(true);
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
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  const seedDefaults = useCallback(
    async (
      defaults: Array<{ name: string; monthly_amounts: number[]; is_monthly: boolean }> 
    ): Promise<void> => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      try {
        const rows = defaults.map((d, i) => ({
          user_id:    userId,
          year,
          name:       d.name,
          monthly_amounts: d.monthly_amounts, 
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
        setLoading(false);
      }
    },
    [supabase, userId, year]
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