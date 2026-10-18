// lib/timeContext.ts

import { differenceInCalendarDays, isPast, isFuture, isToday, parseISO } from "date-fns";
import { Calendar, Check, ChevronsRight, Clock, Siren } from "lucide-react";
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

  if (isDone) {
    return {
      display: "Wykonane",
      color: "text-text-muted bg-surface border-line ",
      icon: Check,
      shouldPulse: false,
    };
  }

  if (isPast(dueDate) && !isToday(dueDate) && !isDone) {
    const daysAgo = Math.abs(differenceInCalendarDays(now, dueDate));
    return {
      display: daysAgo === 1 ? "Od\u00A0wczoraj" : `Zaległe\u00A0${daysAgo}\u00A0dni`,
      color: "text-danger bg-danger-soft border-danger-line ",
      icon: Siren,
      shouldPulse: true,
    };
  }

  if (isToday(dueDate)) {
    return {
      display: `Dzisiaj`,
      color: "text-info bg-info-soft border-info-line ",
      icon: Clock,
      shouldPulse: true,
    };
  }

  const daysUntil = differenceInCalendarDays(dueDate, now);
  if (daysUntil <= 7 && isFuture(dueDate)) {
    const dayName = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"][dueDate.getDay()];
    return {
      display: `${daysUntil === 1 ? "Jutro" : dayName + " (" + daysUntil + " dni)"}`,
      color: "text-success bg-success-soft border-success-line ",
      icon: ChevronsRight,
      shouldPulse: false,
    };
  }

  return {
    display: `Za ${daysUntil} dni`,
    color: "text-text-secondary bg-surface border-line ",
    icon: Calendar,
    shouldPulse: false,
  };
}
