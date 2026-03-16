// hooks/useDailyHabits.ts
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

  // Fetch — błąd fetcha nie jest krytyczny, fallback do domyślnych wartości
  const fetchHabits = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_habits")
        .select("*")
        .eq("date", targetDate)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      setHabits(
        data
          ? { ...data, water_amount: data.water_amount ?? 0, daily_spending: data.daily_spending ?? 0 }
          : getDefaultHabits(targetDate, userId)
      );
    } catch {
      setHabits(getDefaultHabits(targetDate, userId));
    } finally {
      setLoading(false);
    }
  };

  // Optimistic toggle → upsert → rollback + throw na błąd
  const toggleHabit = async (key: HabitKey) => {
    if (!habits || !userId) return;

    const prevValue = habits[key] as boolean;
    const newValue = !prevValue;

    setHabits((h) => (h ? { ...h, [key]: newValue } : h));

    try {
      const { error } = await supabase.from("daily_habits").upsert(
        {
          date: targetDate,
          user_id: userId,
          [key]: newValue,
          water_amount: habits.water_amount ?? 0,
          daily_spending: habits.daily_spending ?? 0,
        },
        { onConflict: "date,user_id" }
      );
      if (error) throw error;
    } catch (err) {
      setHabits((h) => (h ? { ...h, [key]: prevValue } : h));
      throw err;
    }
  };

  const updateWater = async (amount: number) => {
    if (!habits || !userId) return;

    const validAmount = isNaN(amount) ? 0 : amount;
    const prevAmount = habits.water_amount;

    setHabits((h) => (h ? { ...h, water_amount: validAmount } : h));

    try {
      const { error } = await supabase.from("daily_habits").upsert(
        {
          date: targetDate,
          user_id: userId,
          water_amount: validAmount,
          daily_spending: habits.daily_spending ?? 0,
        },
        { onConflict: "date,user_id" }
      );
      if (error) throw error;
    } catch (err) {
      setHabits((h) => (h ? { ...h, water_amount: prevAmount } : h));
      throw err;
    }
  };

  const updateSpending = async (amount: number) => {
    if (!habits || !userId) return;

    const validAmount = isNaN(amount) ? 0 : amount;
    const prevAmount = habits.daily_spending;

    setHabits((h) => (h ? { ...h, daily_spending: validAmount } : h));

    try {
      const { error } = await supabase.from("daily_habits").upsert(
        {
          date: targetDate,
          user_id: userId,
          daily_spending: validAmount,
          water_amount: habits.water_amount ?? 0,
        },
        { onConflict: "date,user_id" }
      );
      if (error) throw error;
    } catch (err) {
      setHabits((h) => (h ? { ...h, daily_spending: prevAmount } : h));
      throw err;
    }
  };

  useEffect(() => {
    fetchHabits();
  }, [userId, targetDate]);

  return { habits, loading, fetchHabits, toggleHabit, updateWater, updateSpending };
}