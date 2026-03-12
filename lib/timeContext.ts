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
      color: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
      icon: Check,
      shouldPulse: false,
    };
  }

  // 2. STATUS: ZALEGŁE
  if (isPast(dueDate) && !isToday(dueDate) && !isDone) {
    const daysAgo = Math.abs(differenceInCalendarDays(now, dueDate));
    return {
      display: daysAgo === 1 ? 'Od\u00A0wczoraj' : `Zaległe\u00A0${daysAgo}\u00A0dni`,
      // ZMIANA: Tekst red-300 (bardzo jasny) na bardzo ciemnym czerwonym tle (950) z wyraźną, ale nierażącą ramką (800)
      color: 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/80',
      icon: Siren,
      shouldPulse: true,
    };
  }
  
  // 3. STATUS: DZISIAJ
  if (isToday(dueDate)) {
      return {
        display: `Dzisiaj`,
        // ZMIANA: Skonkretyzowano kolory (niebieski). Jeśli używasz zmiennej 'primary', upewnij się, że ma jasny odpowiednik dla trybu ciemnego. 
        // Użycie tailwindowego 'blue' gwarantuje perfekcyjny kontrast.
        color: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/80',
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
      // ZMIANA: Tekst green-300 świetnie odcina się od ciemnozielonego tła, nie męcząc wzroku.
      color: 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800/80',
      icon: ChevronsRight,
      shouldPulse: false,
    };
  }
  
  // 5. STATUS: DALEKA PRZYSZŁOŚĆ (powyżej 7 dni)
  return {
    display: `Za ${daysUntil} dni`,
    // ZMIANA: Użycie wyraźnych szarości zamiast przezroczystości, aby element nie "znikał" na ciemnych kartach.
    color: 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700',
    icon: Calendar,
    shouldPulse: false,
  };
}