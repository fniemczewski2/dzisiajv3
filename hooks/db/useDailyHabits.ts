// hooks/db/useDailyHabits.ts

import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useState, useCallback } from "react";
import { getAppDate } from "@/lib/dateUtils";
import { DailyHabitsRow } from "@/types/habits";
import { isHabitDone, isLegacyHabitId } from "@/lib/habits";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";

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
});

export function useDailyHabits(date?: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();
  const today = getAppDate();
  const targetDate = date ?? today;
  const [loading, setLoading] = useState(false);

  const queryHabits = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<DailyHabitsRow | null> => {
      if (!userId) throw new NotSignedInError();
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("daily_habits")
              .select("*")
              .eq("date", targetDate)
              .eq("user_id", userId)
              .abortSignal(signal)
              .maybeSingle(),
          signal
        );
        if (error) throw error;
        return data ? { ...data, water_amount: data.water_amount ?? 0 } : getDefaultHabits(targetDate, userId);
      } catch (err) {
        if (isAbortError(err)) throw err;
        toast.error("Błąd ładowania nawyków.", { cause: err });
        // Pusty dzień zamiast blokady – odhaczenie i tak zapisze wiersz w bazie.
        return getDefaultHabits(targetDate, userId);
      }
    },
    [userId, targetDate, supabase, toast, withRetry]
  );
  const {
    data: habits,
    setData: setHabits,
    fetching,
    refetch: fetchHabits,
  } = useQueryState<DailyHabitsRow | null>({
    queryKey: ["daily-habits", userId ?? null, targetDate],
    queryFn: queryHabits,
    initial: null,
    enabled: Boolean(userId),
  });

  /** Odhacza/odznacza nawyk o danym id (własny albo jeden z dawnych). */
  const toggleHabit = useCallback(
    async (id: string) => {
      if (!habits) return;
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const prevRow = habits;
      const newValue = !isHabitDone(habits, id);
      const nextDone = { ...habits.habits_done, [id]: newValue };
      const legacyPatch = isLegacyHabitId(id) ? { [id]: newValue } : {};
      setHabits((h) => (h ? { ...h, ...legacyPatch, habits_done: nextDone } : h));

      const base = {
        date: targetDate,
        user_id: userId,
        ...legacyPatch,
        water_amount: habits.water_amount ?? 0,
      };
      try {
        let { error } = await withRetry(() =>
          supabase.from("daily_habits").upsert({ ...base, habits_done: nextDone }, { onConflict: "date,user_id" })
        );
        // Baza sprzed migracji 1.40 (brak habits_done): dawne nawyki zapisujemy w kolumnach.
        if (error?.code === "PGRST204" && isLegacyHabitId(id)) {
          ({ error } = await withRetry(() =>
            supabase.from("daily_habits").upsert(base, { onConflict: "date,user_id" })
          ));
        }
        if (error) throw error;
      } catch {
        setHabits(prevRow);
        toast.error("Błąd zapisu nawyku.");
      } finally {
        setLoading(false);
      }
    },
    [habits, userId, targetDate, supabase, toast, withRetry, setHabits]
  );

  const updateWater = useCallback(
    async (amount: number) => {
      if (!habits) return;
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const validAmount = Number.isNaN(amount) ? 0 : amount;
      const prevAmount = habits.water_amount;

      setHabits((h) => (h ? { ...h, water_amount: validAmount } : h));

      try {
        const { error } = await withRetry(() =>
          supabase.from("daily_habits").upsert(
            {
              date: targetDate,
              user_id: userId,
              water_amount: validAmount,
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
    [habits, userId, targetDate, supabase, toast, withRetry, setHabits]
  );

  return { habits, fetching, loading, fetchHabits, toggleHabit, updateWater };
}
