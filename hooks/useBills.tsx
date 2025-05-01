import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Bill } from "../types";
export function useBills(userEmail: string) {
  const supabase = useSupabaseClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchBills = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_name", userEmail);
    setBills(data || []);
    setLoading(false);
  };
  useEffect(() => {
    fetchBills();
  }, [userEmail]);
  return { bills, loading, fetchBills };
}
