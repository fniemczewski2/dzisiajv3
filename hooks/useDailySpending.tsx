import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useCallback, useState, useEffect } from "react";

export function useDailySpending(userEmail: string, date: string) {
  const supabase = useSupabaseClient();
  const [dailySpending, setDailySpending] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetcher, memoized so effect can depend on it safely
  const fetchDailySpending = useCallback(async () => {
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
    } else if (data) {
      setDailySpending(data.daily_spending);
    }
    setLoading(false);
  }, [supabase, date, userEmail]);

  // Kick off initial load (and re-load if date or userEmail changes)
  useEffect(() => {
    fetchDailySpending();
  }, [fetchDailySpending]);

  // Updater, also memoized
  const updateDailySpending = useCallback(
    async (value: number) => {
      setError(null);
      const { error } = await supabase
        .from("daily_habits")
        .update({ daily_spending: value })
        .eq("date", date)
        .eq("user_name", userEmail);

      if (error) {
        setError(error.message);
        return false;
      }

      setDailySpending(value);
      return true;
    },
    [supabase, date, userEmail]
  );

  return {
    dailySpending,
    loading,
    error,
    fetchDailySpending,
    updateDailySpending,
  };
}
