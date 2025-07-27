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

    const { data: billsData, error: billsError } = await supabase
      .from("bills")
      .select("*")
      .eq("user_name", userEmail)
      .eq("include_in_budget", false)
      .order("date", { ascending: true });

    if (billsError) {
      console.error("Fetch bills failed:", billsError.message);
      setBills([]);
    } else {
      setBills(billsData || []);
    }

    if (settings.show_budget_items) {
      const { data: budgetData, error: budgetError } = await supabase
        .from("bills")
        .select("*")
        .eq("user_name", userEmail)
        .eq("include_in_budget", true)
        .eq("done", false)
        .order("date", { ascending: true });

      if (budgetError) {
        console.error("Fetch budgetItems failed:", budgetError.message);
        setBudgetItems([]);
      } else {
        setBudgetItems(budgetData || []);
      }
    }

    setLoading(false);
  }, [supabase, userEmail, settings?.show_budget_items]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const markBudgetItemAsDone = async (id: string) => {
    const { data, error } = await supabase
      .from("bills")
      .update({ done: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Mark done failed:", error.message);
      return;
    }

    setBudgetItems((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    bills,
    budgetItems,
    loading,
    fetchBills,
    markBudgetItemAsDone, 
  };
}
