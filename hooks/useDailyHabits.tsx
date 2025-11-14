// hooks/useDailyHabits.tsx
import { useState, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export type HabitKey =
  | "pills"
  | "bath"
  | "workout"
  | "friends"
  | "work"
  | "housework"
  | "plants"
  | "duolingo";

export interface DailyHabits {
  date: string;
  user_name: string;
  pills: boolean;
  bath: boolean;
  workout: boolean;
  friends: boolean;
  work: boolean;
  housework: boolean;
  plants: boolean;
  duolingo: boolean;
  water_amount: number;
  daily_spending: number;
}

const getDefaultHabits = (date: string, userEmail: string): DailyHabits => ({
  date,
  user_name: userEmail,
  pills: false,
  bath: false,
  workout: false,
  friends: false,
  work: false,
  housework: false,
  plants: false,
  duolingo: false,
  water_amount: 0,
  daily_spending: 0,
});

export function useDailyHabits(date?: string) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";

  const today = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\./g, "-")
    .replace(/\s/g, "");

  const targetDate = date ?? today;

  const [habits, setHabits] = useState<DailyHabits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    if (!userEmail) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("daily_habits")
        .select("*")
        .eq("date", targetDate)
        .eq("user_name", userEmail)
        .maybeSingle();

      if (error) throw error;

      setHabits(data || getDefaultHabits(targetDate, userEmail));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setHabits(getDefaultHabits(targetDate, userEmail));
    } finally {
      setLoading(false);
    }
  }, [supabase, targetDate, userEmail]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const toggleHabit = useCallback(
    async (key: HabitKey) => {
      if (!habits) return;

      const newValue = !habits[key];

      // Optimistic update
      setHabits((prev) => (prev ? { ...prev, [key]: newValue } : prev));

      try {
        const { error } = await supabase
          .from("daily_habits")
          .upsert(
            {
              date: targetDate,
              user_name: userEmail,
              [key]: newValue,
            },
            { onConflict: "date,user_name" }
          );

        if (error) throw error;
      } catch (err) {
        // Rollback on error
        setHabits((prev) => (prev ? { ...prev, [key]: !newValue } : prev));
        setError(err instanceof Error ? err.message : "Failed to update habit");
      }
    },
    [habits, supabase, targetDate, userEmail]
  );

  const updateWater = useCallback(
    async (amount: number) => {
      if (!habits) return;

      // Optimistic update
      setHabits((prev) => (prev ? { ...prev, water_amount: amount } : prev));

      try {
        const { error } = await supabase
          .from("daily_habits")
          .upsert(
            {
              date: targetDate,
              user_name: userEmail,
              water_amount: amount,
            },
            { onConflict: "date,user_name" }
          );

        if (error) throw error;
      } catch (err) {
        // Rollback on error
        setHabits((prev) =>
          prev ? { ...prev, water_amount: habits.water_amount } : prev
        );
        setError(err instanceof Error ? err.message : "Failed to update water");
      }
    },
    [habits, supabase, targetDate, userEmail]
  );

  const updateSpending = useCallback(
    async (amount: number) => {
      if (!habits) return;

      // Optimistic update
      setHabits((prev) => (prev ? { ...prev, daily_spending: amount } : prev));

      try {
        const { error } = await supabase
          .from("daily_habits")
          .upsert(
            {
              date: targetDate,
              user_name: userEmail,
              daily_spending: amount,
            },
            { onConflict: "date,user_name" }
          );

        if (error) throw error;
      } catch (err) {
        // Rollback on error
        setHabits((prev) =>
          prev ? { ...prev, daily_spending: habits.daily_spending } : prev
        );
        setError(
          err instanceof Error ? err.message : "Failed to update spending"
        );
      }
    },
    [habits, supabase, targetDate, userEmail]
  );

  return {
    habits,
    loading,
    error,
    fetchHabits,
    toggleHabit,
    updateWater,
    updateSpending,
  };
}