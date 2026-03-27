// hooks/useStreaks.ts

import { useState, useEffect, useCallback } from "react";
import { Streak } from "../types";
import { useAuth } from "../providers/AuthProvider";

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

const MONTH_MESSAGES: Record<number, string> = {
  1: "Pierwszy miesiąc!",
  2: "Dwa miesiące!",
  3: "Trzy miesiące!",
  4: "Cztery miesiące!",
  5: "Pięć miesięcy!",
  6: "Pół roku!",
};

const DAY_MESSAGES: Record<number, string> = {
  0: "Dobry start!",
  7: "Pierwszy tydzień!",
  100: "100 dni!",
  420: "420 dni!",
  2137: "2137 dni!",
};

const checkAnniversaryMilestone = (start: Date, current: Date, days: number): string | null => {
  const isAnniversary =
    start.getDate() === current.getDate() ||
    (start.getDate() > current.getDate() && isLastDayOfMonth(current));

  if (!isAnniversary || days < 28) return null;

  const monthsPassed = (current.getFullYear() - start.getFullYear()) * 12 + current.getMonth() - start.getMonth();
  const yearsPassed = current.getFullYear() - start.getFullYear();

  if (monthsPassed > 0 && monthsPassed % 12 === 0) return `${getYearsLabel(yearsPassed)}!`;
  if (monthsPassed > 0) return MONTH_MESSAGES[monthsPassed] || `${getMonthsLabel(monthsPassed)}!`;

  return null;
};

const checkDaysMilestone = (days: number): string | null => {
  if (DAY_MESSAGES[days]) return DAY_MESSAGES[days];
  if (days > 0 && days % 100 === 0) return `${days} dni! Kontynuuj!`;
  return null;
};

export const getMilestoneMessage = (
  startDateInput: string | Date,
  currentDateInput: string | Date = new Date()
): string => {
  const start = new Date(startDateInput);
  const current = new Date(currentDateInput);
  start.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  const days = Math.round((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "";

  const anniversaryMsg = checkAnniversaryMilestone(start, current, days);
  if (anniversaryMsg) return anniversaryMsg;

  const daysMsg = checkDaysMilestone(days);
  if (daysMsg) return daysMsg;

  return "";
};

export function useStreaks() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStreaks = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      setStreaks(data || []);
    } finally {
      setFetching(false);
    }
  }, [userId, supabase]);

  const addStreak = async (newStreak: Omit<Streak, "id" | "user_id">) => {
    setLoading(true);
    const { error } = await supabase
      .from("streaks")
      .insert([{ ...newStreak, user_id: userId }]);
    if (error) throw error;
    try {
      await fetchStreaks();
    } finally {
      setLoading(false);
    }
  };

  const deleteStreak = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("streaks").delete().eq("id", id);
    if (error) throw error;
    try {
      await fetchStreaks();
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = async (id: string, updates: Partial<Streak>) => {
    setLoading(true);
    const { error } = await supabase.from("streaks").update(updates).eq("id", id);
    if (error) throw error;
    setStreaks((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    try {
      await fetchStreaks();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  return {
    streaks,
    loading,
    fetching,
    fetchStreaks,
    refetch: fetchStreaks,
    addStreak,
    deleteStreak,
    updateStreak,
    getMilestoneMessage,
  };
}