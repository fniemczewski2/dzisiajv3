// hooks/useStreaks.ts

import { useCallback } from "react";
import { Streak } from "@/types/streaks";
import { useCrudResource } from "./useCrudResource";

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

type StreakInsert = Omit<Streak, "id" | "user_id">;

const MESSAGES = {
  fetchError: "Błąd pobierania celów.",
  added: "Dodano cel",
  addError: "Błąd dodawania celu.",
  edited: "Zaktualizowano cel",
  editError: "Błąd aktualizacji celu.",
  deleted: "Usunięto cel",
  deleteError: "Błąd usuwania celu.",
  confirmDelete: "Czy chcesz usunąć cel?",
};

export function useStreaks() {
  const crud = useCrudResource<Streak, StreakInsert>({
    table: "streaks",
    order: { column: "start_date", ascending: false },
    insertPosition: "start",
    messages: MESSAGES,
  });

  const deleteStreak = useCallback(
    async (id: string): Promise<void> => {
      await crud.remove(id);
    },
    [crud]
  );

  return {
    streaks: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    fetchStreaks: crud.refetch,
    refetch: crud.refetch,
    addStreak: crud.add,
    deleteStreak,
    updateStreak: crud.patch,
    getMilestoneMessage,
  };
}
