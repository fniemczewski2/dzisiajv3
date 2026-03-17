// hooks/useStreaks.ts

import { useState, useEffect, useCallback } from "react";
import { Streak } from "../types";
import { useAuth } from "../providers/AuthProvider";

export function useStreaks() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      setStreaks(data || []);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  /** Throws on error — caller: withRetry + toast.success("Dodano pomyślnie.") */
  const addStreak = async (newStreak: Omit<Streak, "id" | "user_id">) => {
    const { error } = await supabase
      .from("streaks")
      .insert([{ ...newStreak, user_id: userId }]);
    if (error) throw error;
    await fetchStreaks();
  };

  const deleteStreak = async (id: string) => {
    const { error } = await supabase.from("streaks").delete().eq("id", id);
    if (error) throw error;
    await fetchStreaks();
  };

  const updateStreak = async (id: string, updates: Partial<Streak>) => {
    const { error } = await supabase.from("streaks").update(updates).eq("id", id);
    if (error) throw error;
    setStreaks((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const getMilestoneMessage = (
    startDateInput: string | Date,
    currentDateInput: string | Date = new Date()
  ): string => {
    const start = new Date(startDateInput);
    const current = new Date(currentDateInput);
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);

    const days = Math.round(
      (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) return "";

    const getMonthsLabel = (m: number) => {
      const d = m % 10, td = m % 100;
      if (d >= 2 && d <= 4 && (td < 10 || td >= 20)) return `${m} miesiące`;
      return `${m} miesięcy`;
    };

    const getYearsLabel = (y: number) => {
      if (y === 1) return "ROK";
      const d = y % 10, td = y % 100;
      if (d >= 2 && d <= 4 && (td < 10 || td >= 20)) return `${y} lata`;
      return `${y} lat`;
    };

    const isLastDayOfMonth = (date: Date) => {
      const next = new Date(date);
      next.setDate(date.getDate() + 1);
      return next.getDate() === 1;
    };

    const isAnniversary =
      start.getDate() === current.getDate() ||
      (start.getDate() > current.getDate() && isLastDayOfMonth(current));

    if (isAnniversary && days >= 28) {
      const monthsPassed =
        (current.getFullYear() - start.getFullYear()) * 12 +
        current.getMonth() - start.getMonth();
      const yearsPassed = current.getFullYear() - start.getFullYear();

      if (monthsPassed > 0 && monthsPassed % 12 === 0) return `${getYearsLabel(yearsPassed)}!`;
      if (monthsPassed > 0) {
        if (monthsPassed === 1) return "Pierwszy miesiąc!";
        if (monthsPassed === 2) return "Dwa miesiące!";
        if (monthsPassed === 3) return "Trzy miesiące!";
        if (monthsPassed === 4) return "Cztery miesiące!";
        if (monthsPassed === 5) return "Pięć miesięcy!";
        if (monthsPassed === 6) return "Pół roku!";
        return `${getMonthsLabel(monthsPassed)}!`;
      }
    }

    if (days === 0)   return "Dobry start!";
    if (days === 7)   return "Pierwszy tydzień!";
    if (days === 100) return "100 dni!";
    if (days > 0 && days % 100 === 0) return `${days} dni! Kontynuuj!`;
    return "";
  };

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  return {
    streaks,
    loading,
    fetchStreaks,
    refetch: fetchStreaks,
    addStreak,
    deleteStreak,
    updateStreak,
    getMilestoneMessage,
  };
}