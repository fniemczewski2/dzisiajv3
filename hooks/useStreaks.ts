// hooks/useStreaks.ts
import { useState, useEffect } from "react";
import { Streak } from "../types";
import { useAuth } from "../providers/AuthProvider";

export function useStreaks() {
  const { user, supabase } = useAuth(); 
  const userId = user?.id; 
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setStreaks(data || []);
    } catch (error) {
      console.error("Błąd podczas pobierania streaksów:", error);
    } finally {
      setLoading(false);
    }
  };

  const addStreak = async (newStreak: Omit<Streak, "id" | "user_id">) => {
    try {
      const { error } = await supabase.from("streaks").insert([{...newStreak, user_id: userId }]);
      if (error) throw error;
      await fetchStreaks();
    } catch (error) {
      console.error("Błąd podczas dodawania streaka:", error);
      alert("Nie udało się dodać");
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
    if (userId) {
      fetchStreaks();
    }
  }, [userId]);

  return {
    streaks,
    loading,
    refetch: fetchStreaks,
    deleteStreak,
    updateStreak,
  };
}
