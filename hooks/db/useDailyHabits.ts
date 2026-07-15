import { useState, useEffect, useCallback } from "react";
import { getAppDate } from "@/lib/dateUtils";
import { DailyHabitsRow, HabitKey } from "@/types/habits";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

const getDefaultHabits = (date: string, userId: string): DailyHabitsRow => ({
  date: date,
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
  const { toast } = useToast();
  const withRetry = useRetry();

  const today = getAppDate();
  const targetDate = date ?? today;

  const [habits, setHabits] = useState<DailyHabitsRow | null>(null);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching && toast.loading) toastId = toast.loading("Ładowanie nawyków...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchHabits = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("daily_habits").select("*").eq("date", targetDate).eq("user_id", userId).maybeSingle()
      );

      if (error) throw error;

      setHabits(
        data
          ? { ...data, water_amount: data.water_amount ?? 0, daily_spending: data.daily_spending ?? 0 }
          : getDefaultHabits(targetDate, userId)
      );
    } catch {
      setHabits(getDefaultHabits(targetDate, userId));
      toast.error("Błąd ładowania nawyków.");
    } finally {
      setFetching(false);
    }
  }, [userId, targetDate, supabase, toast, withRetry]);

  const toggleHabit = useCallback(
    async (key: HabitKey) => {
      if (!habits) return;
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const prevValue = habits[key] as boolean;
      const newValue = !prevValue;

      setHabits((h) => (h ? { ...h, [key]: newValue } : h));

      try {
        const { error } = await withRetry(async () =>
          supabase.from("daily_habits").upsert(
            {
              date: targetDate,
              user_id: userId,
              [key]: newValue,
              water_amount: habits.water_amount ?? 0,
              daily_spending: habits.daily_spending ?? 0,
            },
            { onConflict: "date,user_id" }
          )
        );
        if (error) throw error;
      } catch {
        setHabits((h) => (h ? { ...h, [key]: prevValue } : h));
        toast.error("Błąd zapisu nawyku.");
      } finally {
        setLoading(false);
      }
    },
    [habits, userId, targetDate, supabase, toast, withRetry]
  );

  const updateWater = useCallback(
    async (amount: number) => {
      if (!habits) return;
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const validAmount = Number.isNaN(amount) ? 0 : amount;
      const prevAmount = habits.water_amount;

      setHabits((h) => (h ? { ...h, water_amount: validAmount } : h));

      try {
        const { error } = await withRetry(async () =>
          supabase.from("daily_habits").upsert(
            {
              date: targetDate,
              user_id: userId,
              water_amount: validAmount,
              daily_spending: habits.daily_spending ?? 0,
            },
            { onConflict: "date,user_id" }
          )
        );
        if (error) throw error;
      } catch {
        setHabits((h) => (h ? { ...h, water_amount: prevAmount } : h));
        toast.error("Błąd zapisu ilości wody.");
      } finally {
        setLoading(false);
      }
    },
    [habits, userId, targetDate, supabase, toast, withRetry]
  );

  const updateSpending = useCallback(
    async (amount: number) => {
      if (!habits) return;
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const validAmount = Number.isNaN(amount) ? 0 : amount;
      const prevAmount = habits.daily_spending;

      setHabits((h) => (h ? { ...h, daily_spending: validAmount } : h));

      try {
        const { error } = await withRetry(async () =>
          supabase.from("daily_habits").upsert(
            {
              date: targetDate,
              user_id: userId,
              daily_spending: validAmount,
              water_amount: habits.water_amount ?? 0,
            },
            { onConflict: "date,user_id" }
          )
        );
        if (error) throw error;
      } catch {
        setHabits((h) => (h ? { ...h, daily_spending: prevAmount } : h));
        toast.error("Błąd zapisu wydatków dnia.");
      } finally {
        setLoading(false);
      }
    },
    [habits, userId, targetDate, supabase, toast, withRetry]
  );

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return { habits, loading, fetchHabits, toggleHabit, updateWater, updateSpending };
}
