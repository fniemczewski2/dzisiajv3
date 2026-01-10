// hooks/useStreaks.ts
import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Streak } from "../types";

export function useStreaks(userEmail: string) {
  const supabase = useSupabaseClient();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_email", userEmail)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setStreaks(data || []);
    } catch (error) {
      console.error("Błąd podczas pobierania streaksów:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteStreak = async (id: string) => {
    try {
      const { error } = await supabase.from("streaks").delete().eq("id", id);
      if (error) throw error;
      await fetchStreaks();
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      alert("Nie udało się usunąć");
    }
  };

  const updateStreak = async (id: string, updates: Partial<Streak>) => {
    try {
      const { error } = await supabase
        .from("streaks")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
      
      setStreaks(prevStreaks =>
        prevStreaks.map(streak =>
          streak.id === id ? { ...streak, ...updates } : streak
        )
      );
    } catch (error) {
      console.error("Błąd podczas aktualizacji:", error);
      await fetchStreaks();
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchStreaks();
    }
  }, [userEmail]);

  return {
    streaks,
    loading,
    refetch: fetchStreaks,
    deleteStreak,
    updateStreak,
  };
}
