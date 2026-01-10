// hooks/useBills.ts
import { useState, useEffect } from "react";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";
import { Bill } from "../types";
import { useSettings } from "./useSettings";

export function useBills() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { settings } = useSettings();
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgetItems, setBudgetItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBills = async () => {
    if (!userEmail || settings == null) return;
    setLoading(true);

    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_name", userEmail)
      .eq("is_income", false)
      .order("date", { ascending: true });

    setBills(data || []);

    if (settings.show_budget_items) {
      const { data: budgetData } = await supabase
        .from("bills")
        .select("*")
        .eq("user_name", userEmail)
        .eq("is_income", true)
        .eq("done", false)
        .order("date", { ascending: true });

      setBudgetItems(budgetData || []);
    }

    setLoading(false);
  };

  const addBill = async (bill: Omit<Bill, "id" | "user_name">) => {
    if (!userEmail) return;
    setLoading(true);
    const { data } = await supabase
      .from("bills")
      .insert({ ...bill, user_name: userEmail })
      .select()
      .single();
    
    if (data) {
      if (bill.is_income) {
        setBudgetItems((prev) => [...prev, data]);
      } else {
        setBills((prev) => [...prev, data]);
      }
    }
    setLoading(false);
  };

  const editBill = async (bill: Bill) => {
    if (!userEmail) return;
    setLoading(true);
    const { data } = await supabase
      .from("bills")
      .update({ ...bill, user_name: userEmail })
      .eq("id", bill.id)
      .select()
      .single();
    
    if (data) {
      if (bill.is_income) {
        setBudgetItems((prev) => prev.map((b) => (b.id === bill.id ? data : b)));
      } else {
        setBills((prev) => prev.map((b) => (b.id === bill.id ? data : b)));
      }
    }
    
    setLoading(false);
  };

  const deleteBill = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    await supabase.from("bills").delete().eq("id", id);
    await fetchBills();
    setLoading(false);
  };

  const markAsDone = async (id: string) => {
    if (!userEmail) return;
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
  }, [userEmail, settings?.show_budget_items]);

  return {
    bills,
    budgetItems,
    loading,
    fetchBills,
    addBill,
    editBill,
    deleteBill,
    markAsDone,
  };
}

export default useBills;
