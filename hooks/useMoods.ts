// hooks/useMoods.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";
import { MoodEntry } from "../types";

export function useMoods(startDate?: string, endDate?: string) {
  const { supabase, user } = useAuth();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchMoods = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      let query = supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", user.id);
      if (startDate) query = query.gte("date", startDate);
      if (endDate)   query = query.lte("date", endDate);

      const { data, error } = await query;
      if (error) throw error;
      setMoods(data || []);
    } finally {
      setFetching(false);
    }
  }, [supabase, user, startDate, endDate]);

  useEffect(() => { fetchMoods(); }, [fetchMoods]);

  const logMood = async (date: string, mood_id: string | null) => {
    if (!user) throw new Error("Musisz być zalogowany");
    setLoading(true)
    const { data, error } = await supabase
      .from("mood_entries")
      .upsert({ user_id: user.id, date, mood_id }, { onConflict: "user_id, date" })
      .select()
      .single();

    if (error) throw error;

    setMoods((prev) => {
      const exists = prev.find((m) => m.date === date);
      return exists
        ? prev.map((m) => (m.date === date ? (data as MoodEntry) : m))
        : [...prev, data as MoodEntry];
    });
    setLoading(false)
  };

  return { moods, loading, fetching, logMood, fetchMoods };
}