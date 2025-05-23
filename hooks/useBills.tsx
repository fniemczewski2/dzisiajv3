import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Bill } from "../types";
import { useSettings } from "./useSettings";

export function useBills(userEmail: string) {
  const supabase = useSupabaseClient();
  const { settings } = useSettings(userEmail);
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgetItems, setBudgetItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBills = useCallback(async () => {
    if (!userEmail || settings == null) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_name", userEmail)
      .eq("include_in_budget", false)
      .order("date", { ascending: true });

    if (error) {
      console.error("Fetch bills failed:", error.message);
      setBills([]);
    } else {
      setBills(data || []);
    }

    if (settings.show_budget_items) {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("user_name", userEmail)
        .eq("include_in_budget", true)
        .order("date", { ascending: true });

      if (error) {
        console.error("Fetch budgetItems failed:", error.message);
        setBudgetItems([]);
      } else {
        setBudgetItems(data || []);
      }
    }

    setLoading(false);
  }, [supabase, userEmail, settings?.show_budget_items]);

  // Odpalamy fetch na starcie i przy zmianie ustawienia show_budget_items
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return { bills, budgetItems, loading, fetchBills };
}
