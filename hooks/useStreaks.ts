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

  const getMilestoneMessage = (
    startDateInput: string | Date,
    currentDateInput: string | Date = new Date()
  ): string => {
    const start = new Date(startDateInput);
    const current = new Date(currentDateInput);
  
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
  
    const diffTime = current.getTime() - start.getTime();
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
    if (days < 0) return "";
  
    const getMonthsLabel = (m: number) => {
      const lastDigit = m % 10;
      const lastTwoDigits = m % 100;
      if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
        return `${m} miesiące`;
      }
      return `${m} miesięcy`;
    };
  
    const getYearsLabel = (y: number) => {
      if (y === 1) return "ROK";
      const lastDigit = y % 10;
      const lastTwoDigits = y % 100;
      if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
        return `${y} lata`;
      }
      return `${y} lat`;
    };
  
    const isLastDayOfMonth = (date: Date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      return nextDay.getDate() === 1;
    };
  
    const isAnniversary =
      start.getDate() === current.getDate() ||
      (start.getDate() > current.getDate() && isLastDayOfMonth(current));
  
    if (isAnniversary && days >= 28) {
      const monthsPassed =
        (current.getFullYear() - start.getFullYear()) * 12 +
        current.getMonth() -
        start.getMonth();
      const yearsPassed = current.getFullYear() - start.getFullYear();
  
      if (monthsPassed > 0 && monthsPassed % 12 === 0) {
        return `${getYearsLabel(yearsPassed)}!`;
      }
  
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
    if (days === 0) return "Dobry start!";
    if (days === 7) return "Pierwszy tydzień!";
    if (days === 100) return "100 dni!";
    if (days > 0 && days % 100 === 0) return `${days} dni! Kontynuuj!`;
  
    return "";
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
    getMilestoneMessage
  };
}
