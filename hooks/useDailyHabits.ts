import { useState, useEffect } from "react";
import { getAppDate } from "../lib/dateUtils";
import { DailyHabits, HabitKey } from "../types";
import { useAuth } from "../providers/AuthProvider";

const getDefaultHabits = (date: string, userId: string): DailyHabits => ({
  date: new Date(date),
  user_id: userId,
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
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const today = getAppDate();
  const targetDate = date ?? today;

  const [habits, setHabits] = useState<DailyHabits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("daily_habits")
        .select("*")
        .eq("date", targetDate)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHabits({
          ...data,
          water_amount: data.water_amount ?? 0,
          daily_spending: data.daily_spending ?? 0,
        });
      } else {
        setHabits(getDefaultHabits(targetDate, userId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setHabits(getDefaultHabits(targetDate, userId));
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (key: HabitKey) => {
    if (!habits || !userId) return;

    const newValue = !habits[key];

    setHabits((prev) => (prev ? { ...prev, [key]: newValue } : prev));

    try {
      const payload = {
        date: targetDate,
        user_id: userId,
        [key]: newValue,
        water_amount: habits.water_amount ?? 0,
        daily_spending: habits.daily_spending ?? 0,
      };

      const { error } = await supabase
        .from("daily_habits")
        .upsert(payload, { onConflict: "date,user_id" });

      if (error) throw error;
    } catch (err) {
      console.error("Toggle habit error:", err);
      setHabits((prev) => (prev ? { ...prev, [key]: !newValue } : prev));
      setError(err instanceof Error ? err.message : "Failed to update habit");
    }
  };

  const updateWater = async (amount: number) => {
    if (!habits || !userId) return;

    const validAmount = isNaN(amount) ? 0 : amount;

    setHabits((prev) => (prev ? { ...prev, water_amount: validAmount } : prev));

    try {
      const payload = {
        date: targetDate,
        user_id: userId,
        water_amount: validAmount,
        daily_spending: habits.daily_spending ?? 0,
      };

      const { error } = await supabase
        .from("daily_habits")
        .upsert(payload, { onConflict: "date,user_id" });

      if (error) throw error;
    } catch (err) {
      console.error("Update water error:", err);
      setHabits((prev) =>
        prev ? { ...prev, water_amount: habits.water_amount } : prev
      );
      setError(err instanceof Error ? err.message : "Failed to update water");
    }
  };

  const updateSpending = async (amount: number) => {
    if (!habits || !userId) return;

    const validAmount = isNaN(amount) ? 0 : amount;
    setHabits((prev) => (prev ? { ...prev, daily_spending: validAmount } : prev));

    try {
      const payload = {
        date: targetDate,
        user_id: userId,
        daily_spending: validAmount,
        water_amount: habits.water_amount ?? 0,
      };

      const { error } = await supabase
        .from("daily_habits")
        .upsert(payload, { onConflict: "date,user_id" });

      if (error) throw error;
    } catch (err) {
      console.error("Update spending error:", err);
      setHabits((prev) =>
        prev ? { ...prev, daily_spending: habits.daily_spending } : prev
      );
      setError(
        err instanceof Error ? err.message : "Failed to update spending"
      );
    }
  };

  useEffect(() => {
    fetchHabits();
  }, [userId, targetDate]);

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