// hooks/useBills.ts

import { useState, useEffect, useCallback } from "react";
import { Bill } from "../types";
import { useSettings } from "./useSettings";
import { useAuth } from "../providers/AuthProvider";

export function useBills() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [incomeItems, setIncomeItems] = useState<Bill[]>([]);
  const [expenseItems, setExpenseItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBills = useCallback(async () => {
    if (!userId || settings == null) return;
    setLoading(true);
    try {
      const { data: incomeData, error: incomeError } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", userId)
        .eq("is_income", true)
        .eq("done", false)
        .order("date", { ascending: true });

      if (incomeError) throw incomeError;
      setIncomeItems(incomeData || []);

      if (settings.show_budget_items) {
        const { data: budgetData, error: budgetError } = await supabase
          .from("bills")
          .select("*")
          .eq("user_id", userId)
          .eq("is_income", false)
          .eq("done", false)
          .order("date", { ascending: true });

        if (budgetError) throw budgetError;
        setExpenseItems(budgetData || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, settings, supabase]);

  /** Throws on error — caller: withRetry + toast.success("Dodano pomyślnie.") */
  const addBill = async (bill: Omit<Bill, "id" | "user_id">): Promise<Bill> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bills")
        .insert({ ...bill, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Brak danych zwróconych przez bazę");

      if (bill.is_income) {
        setIncomeItems((prev) => [...prev, data as Bill]);
      } else {
        setExpenseItems((prev) => [...prev, data as Bill]);
      }

      return data as Bill;
    } finally {
      setLoading(false);
    }
  };

  const editBill = async (bill: Bill): Promise<Bill> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bills")
        .update({ ...bill, user_id: userId })
        .eq("id", bill.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Brak danych zwróconych przez bazę");

      if (bill.is_income) {
        setIncomeItems((prev) => prev.map((b) => (b.id === bill.id ? (data as Bill) : b)));
      } else {
        setExpenseItems((prev) => prev.map((b) => (b.id === bill.id ? (data as Bill) : b)));
      }

      return data as Bill;
    } finally {
      setLoading(false);
    }
  };

  const deleteBill = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { error } = await supabase.from("bills").delete().eq("id", id);
      if (error) throw error;
      setIncomeItems((prev) => prev.filter((b) => b.id !== id));
      setExpenseItems((prev) => prev.filter((b) => b.id !== id));
    } finally {
      setLoading(false);
    }
  };

  const markAsDone = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bills")
        .update({ done: true })
        .eq("id", id);
      if (error) throw error;
      setIncomeItems((prev) => prev.filter((b) => b.id !== id));
      setExpenseItems((prev) => prev.filter((b) => b.id !== id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return {
    incomeItems,
    expenseItems,
    loading,
    fetchBills,
    addBill,
    editBill,
    deleteBill,
    markAsDone,
  };
}

export default useBills;