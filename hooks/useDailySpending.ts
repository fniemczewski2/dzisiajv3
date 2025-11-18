import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useState, useEffect } from "react";

export function useDailySpending(userEmail: string, date: string) {
  const supabase = useSupabaseClient();
  const [dailySpending, setDailySpending] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDailySpending = async () => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("daily_habits")
      .select("daily_spending")
      .eq("date", date)
      .eq("user_name", userEmail)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setDailySpending(0);
    } else if (data) {
      setDailySpending(data.daily_spending ?? 0);
    } else {
      setDailySpending(0);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchDailySpending();
  }, [userEmail, date]);

  return {
    dailySpending,
    loading,
    error,
    fetchDailySpending,
  };
}