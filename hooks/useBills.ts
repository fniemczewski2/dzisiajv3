// hooks/useBills.ts
import { useState, useEffect } from "react";
import { Bill } from "../types";
import { useSettings } from "./useSettings";
import { useAuth } from "../providers/AuthProvider";

export function useBills() {

  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const [incomeItems, setIncomeItems] = useState<Bill[]>([]);
  const [expenseItems, setExpenseItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBills = async () => {
    if (!userId || settings == null) return;
    setLoading(true);

    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .eq("is_income", true)
      .eq("done", false)
      .order("date", { ascending: true });

    setIncomeItems(data || []);

    if (settings.show_budget_items) {
      const { data: budgetData } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", userId)
        .eq("is_income", false)
        .eq("done", false)
        .order("date", { ascending: true });

      setExpenseItems(budgetData || []);
    }

    setLoading(false);
  };

  const addBill = async (bill: Omit<Bill, "id" | "user_id">) => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("bills")
      .insert({ ...bill, user_id: userId })
      .select()
      .single();
    
    if (data) {
      if (bill.is_income) {
        setIncomeItems((prev) => [...prev, data]);
      } else {
        setExpenseItems((prev) => [...prev, data]);
      }
    }
    setLoading(false);
  };

  const editBill = async (bill: Bill) => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("bills")
      .update({ ...bill, user_id: userId })
      .eq("id", bill.id)
      .select()
      .single();
    
    if (data) {
      if (bill.is_income) {
        setIncomeItems((prev) => prev.map((b) => (b.id === bill.id ? data : b)));
      } else {
        setExpenseItems((prev) => prev.map((b) => (b.id === bill.id ? data : b)));
      }
    }
    
    setLoading(false);
  };

  const deleteBill = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    await supabase.from("bills").delete().eq("id", id);
    await fetchBills();
    setLoading(false);
  };

  const markAsDone = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    await supabase
      .from("bills")
      .update({ done: true })
      .eq("id", id);
    await fetchBills();
    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
  }, [userId, settings?.show_budget_items]);

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
