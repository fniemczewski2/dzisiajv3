// lib/timeContext.ts
import { formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes, isPast, isFuture, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Check, ChevronRight, ChevronsRight, Clock, Siren } from 'lucide-react';
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
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: Check,
      shouldPulse: false,
    };
  }

  // Overdue
  if (isPast(dueDate) && !isToday(dueDate) && !isDone) {
    const daysAgo = Math.abs(differenceInDays(now, dueDate));
    return {
      display: daysAgo === 1 ? 'Zaległe od wczoraj' : `Zaległe ${daysAgo} dni`,
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: Siren,
      shouldPulse: true,
    };
  }
  
  if (isToday(dueDate)) {
      return {
        display: `Dzisiaj`,
        color: 'text-primary bg-blue-50 border-blue-200',
        icon: Clock,
        shouldPulse: true,
      };
  }

  // Tomorrow
  if (isTomorrow(dueDate)) {
    return {
      display: 'Jutro',
      color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      icon: ChevronRight,
      shouldPulse: false,
    };
  }
  
  // Within a week
  const daysUntil = differenceInDays(dueDate, now);
  if (daysUntil <= 7 && isFuture(dueDate)) {
    const dayName = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][dueDate.getDay()];
    return {
      display: `${dayName} (${daysUntil} dni)`,
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: ChevronsRight,
      shouldPulse: false,
    };
  }
  
    return {
      display: `Za ${daysUntil} dni`,
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: Calendar,
      shouldPulse: false,
    };
  }