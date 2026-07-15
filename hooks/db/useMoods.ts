// hooks/useMoods.ts
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { MoodEntry } from "@/types/moods";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

export function useMoods(startDate?: string, endDate?: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching && toast.loading) toastId = toast.loading("Ładowanie nastrojów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchMoods = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () => {
        let query = supabase.from("mood_entries").select("*").eq("user_id", userId);
        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);
        return query;
      });

      if (error) throw error;
      setMoods(data || []);
    } catch {
      toast.error("Błąd pobierania nastrojów.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, startDate, endDate, toast, withRetry]);

  useEffect(() => { fetchMoods(); }, [fetchMoods]);

  const logMood = useCallback(
    async (date: string, moodId: string | null) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = moods;
      setMoods((prev) => {
        const exists = prev.find((m) => m.date === date);
        const optimistic = { date, mood_id: moodId, user_id: userId } as MoodEntry;
        return exists ? prev.map((m) => (m.date === date ? { ...m, ...optimistic } : m)) : [...prev, optimistic];
      });

      try {
        const { data, error } = await withRetry(async () =>
          supabase
            .from("mood_entries")
            .upsert({ user_id: userId, date, mood_id: moodId }, { onConflict: "user_id, date" })
            .select()
            .single()
        );

        if (error) throw error;

        setMoods((prev) => {
          const exists = prev.find((m) => m.date === date);
          return exists
            ? prev.map((m) => (m.date === date ? (data as MoodEntry) : m))
            : [...prev, data as MoodEntry];
        });
        toast.success("Zapisano nastrój");
      } catch {
        setMoods(previous);
        toast.error("Błąd zapisywania nastroju.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, moods, toast, withRetry]
  );

  return { moods, loading, fetching, logMood, fetchMoods };
}
