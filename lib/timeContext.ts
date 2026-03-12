import { differenceInDays, differenceInCalendarDays, isPast, isFuture, isToday, parseISO } from 'date-fns';
import { Calendar, Check, ChevronsRight, Clock, Siren } from 'lucide-react';
import type { LucideIcon } from "lucide-react";

export interface TimeContext {
  display: string;
  color: string;
  icon: LucideIcon;
  shouldPulse: boolean;
}

export function getTimeContext(dueDateString: string, isDone: boolean = false): TimeContext {
  const dueDate = parseISO(dueDateString);
  const now = new Date();

  // 1. STATUS: ZROBIONE
  if (isDone) {
    return {
      display: "Wykonane",
      // Dodałem domyślny, delikatny kolor ramki dla trybu jasnego i ciemnego
      color: 'text-textMuted bg-surface border-gray-200 dark:border-gray-800',
      icon: Check,
      shouldPulse: false,
    };
  }

  // 2. STATUS: ZALEGŁE
  if (isPast(dueDate) && !isToday(dueDate) && !isDone) {
    // Poprawka na dni kalendarzowe
    const daysAgo = Math.abs(differenceInCalendarDays(now, dueDate));
    return {
      display: daysAgo === 1 ? 'Od\u00A0wczoraj' : `Zaległe\u00A0od\u00A0${daysAgo}\u00A0dni`,
      // Wzmocniony kolor ramki (red-300 w jasnym i red-500/30 w ciemnym), żeby był widoczny
      color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500/30',
      icon: Siren,
      shouldPulse: true,
    };
  }
  
  // 3. STATUS: DZISIAJ
  if (isToday(dueDate)) {
      return {
        display: `Dzisiaj`,
        color: 'text-primary bg-surface border-primary',
        icon: Clock,
        shouldPulse: true,
      };
  }
  
  // 4. STATUS: NADCHODZĄCE (do 7 dni)
  const daysUntil = differenceInCalendarDays(dueDate, now);
  if (daysUntil <= 7 && isFuture(dueDate)) {
    const dayName = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][dueDate.getDay()];
    return {
      display: `${daysUntil === 1 ? "Jutro" : dayName + " (" + daysUntil + " dni)" }`,
      // Wzmocniony zielony border
      color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/20 border-green-300 dark:border-green-500/30',
      icon: ChevronsRight,
      shouldPulse: false,
    };
  }
  
  // 5. STATUS: DALEKA PRZYSZŁOŚĆ (powyżej 7 dni)
  return {
    display: `Za ${daysUntil} dni`,
    color: 'text-textSecondary bg-surface border-gray-200 dark:border-gray-800',
    icon: Calendar,
    shouldPulse: false,
  };
}