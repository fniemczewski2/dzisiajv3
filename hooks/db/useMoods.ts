// hooks/useMoods.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { MoodEntry } from "@/types/moods";
import { useToast } from "@/providers/ToastProvider";

export function useMoods(startDate?: string, endDate?: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie nastrojów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchMoods = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      let query = supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", user.id);
      if (startDate) query = query.gte("date", startDate);
      if (endDate)   query = query.lte("date", endDate);

      const { data, error } = await query;
      if (error) {
        setFetching(false);
        throw error;
      }
      setMoods(data || []);
    } finally {
      setFetching(false);
    }
  }, [supabase, user, startDate, endDate, toast]);

  useEffect(() => { fetchMoods(); }, [fetchMoods]);

  const logMood = async (date: string, mood_id: string | null) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("mood_entries")
        .upsert({ user_id: user?.id, date, mood_id }, { onConflict: "user_id, date" })
        .select()
        .single();

      if (error) throw error;

      setMoods((prev) => {
        const exists = prev.find((m) => m.date === date);
        return exists
          ? prev.map((m) => (m.date === date ? (data as MoodEntry) : m))
          : [...prev, data as MoodEntry];
      });
    } finally {
    setLoading(false)
    }
  };

  return { moods, loading, fetching, logMood, fetchMoods };
}