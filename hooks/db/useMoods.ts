// hooks/db/useMoods.ts

import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { MoodEntry } from "@/types/moods";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";

const NO_MOODS: MoodEntry[] = [];

export function useMoods(startDate?: string, endDate?: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  const queryMoods = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<MoodEntry[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        const { data, error } = await withRetry(() => {
          let query = supabase.from("mood_entries").select("*").eq("user_id", userId);
          if (startDate) query = query.gte("date", startDate);
          if (endDate) query = query.lte("date", endDate);
          return query.abortSignal(signal);
        }, signal);
        if (error) throw error;
        return (data || []) as MoodEntry[];
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania nastrojów.", { cause: err });
        throw err;
      }
    },
    [supabase, userId, startDate, endDate, toast, withRetry]
  );
  const {
    data: moods,
    setData: setMoods,
    fetching,
    refetch: fetchMoods,
  } = useQueryState<MoodEntry[]>({
    queryKey: ["moods", userId ?? null, startDate ?? null, endDate ?? null],
    queryFn: queryMoods,
    initial: NO_MOODS,
    enabled: Boolean(userId),
  });

  const logMood = useCallback(
    async (date: string, moodId: string | null) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const previous = moods;
      setMoods((prev) => {
        const exists = prev.find((m) => m.date === date);
        const optimistic = { date, mood_id: moodId, user_id: userId } as MoodEntry;
        return exists ? prev.map((m) => (m.date === date ? { ...m, ...optimistic } : m)) : [...prev, optimistic];
      });

      try {
        const { data, error } = await withRetry(() =>
          supabase
            .from("mood_entries")
            .upsert({ user_id: userId, date, mood_id: moodId }, { onConflict: "user_id, date" })
            .select()
            .single()
        );

        if (error) throw error;

        setMoods((prev) => {
          const exists = prev.find((m) => m.date === date);
          return exists ? prev.map((m) => (m.date === date ? (data as MoodEntry) : m)) : [...prev, data as MoodEntry];
        });
        toast.success("Zapisano nastrój");
      } catch {
        setMoods(previous);
        toast.error("Błąd zapisywania nastroju.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, moods, toast, withRetry, setMoods]
  );

  return { moods, loading, fetching, logMood, fetchMoods };
}
