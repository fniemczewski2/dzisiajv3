// lib/timeContext.ts
import { formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes, isPast, isFuture, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

export interface TimeContext {
  display: string;
  urgency: 'overdue' | 'urgent' | 'soon' | 'upcoming' | 'future';
  color: string;
  icon: string;
  shouldPulse: boolean;
}

/**
 * Get human-readable time context for a due date
 * Returns display text, urgency level, and styling information
 */
export function getTimeContext(dueDateString: string): TimeContext {
  const dueDate = parseISO(dueDateString);
  const now = new Date();
  
  // Overdue
  if (isPast(dueDate) && !isToday(dueDate)) {
    const daysAgo = Math.abs(differenceInDays(now, dueDate));
    return {
      display: daysAgo === 1 ? 'Zaległe od wczoraj' : `Zaległe ${daysAgo} dni`,
      urgency: 'overdue',
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: '🚨',
      shouldPulse: true,
    };
  }
  
  // Today
  if (isToday(dueDate)) {
    const hoursLeft = differenceInHours(dueDate, now);
    const minutesLeft = differenceInMinutes(dueDate, now);
    
    if (minutesLeft < 0) {
      return {
        display: 'Zaległe dzisiaj',
        urgency: 'overdue',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: '🚨',
        shouldPulse: true,
      };
    }
    
    if (hoursLeft < 1) {
      return {
        display: `Za ${minutesLeft} min`,
        urgency: 'urgent',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: '⏰',
        shouldPulse: true,
      };
    }
    
    if (hoursLeft < 3) {
      return {
        display: `Za ${hoursLeft}h`,
        urgency: 'urgent',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: '⚡',
        shouldPulse: true,
      };
    }
    
    return {
      display: 'Dzisiaj',
      urgency: 'soon',
      color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      icon: '📅',
      shouldPulse: false,
    };
  }
  
  // Tomorrow
  if (isTomorrow(dueDate)) {
    return {
      display: 'Jutro',
      urgency: 'soon',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: '📆',
      shouldPulse: false,
    };
  }
  
  // Yesterday (edge case for tasks not marked as done)
  if (isYesterday(dueDate)) {
    return {
      display: 'Zaległe od wczoraj',
      urgency: 'overdue',
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: '🚨',
      shouldPulse: true,
    };
  }
  
  // Within a week
  const daysUntil = differenceInDays(dueDate, now);
  if (daysUntil <= 7 && isFuture(dueDate)) {
    const dayName = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][dueDate.getDay()];
    return {
      display: `${dayName} (${daysUntil}d)`,
      urgency: 'upcoming',
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: '🗓️',
      shouldPulse: false,
    };
  }
  
  // Future (more than a week away)
  if (daysUntil <= 30) {
    return {
      display: `Za ${daysUntil} dni`,
      urgency: 'future',
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: '📋',
      shouldPulse: false,
    };
  }
  
  // Far future
  return {
    display: formatDistanceToNow(dueDate, { addSuffix: true, locale: pl }),
    urgency: 'future',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: '📋',
    shouldPulse: false,
  };
}

/**
 * Get a simple, short time display (for compact views)
 */
export function getShortTimeContext(dueDateString: string): string {
  const dueDate = parseISO(dueDateString);
  const now = new Date();
  
  if (isPast(dueDate) && !isToday(dueDate)) {
    return '🚨 Zaległe';
  }
  
  if (isToday(dueDate)) {
    const hoursLeft = differenceInHours(dueDate, now);
    const minutesLeft = differenceInMinutes(dueDate, now);
    
    if (minutesLeft < 0) return '🚨 Zaległe';
    if (hoursLeft < 1) return `⏰ ${minutesLeft}m`;
    if (hoursLeft < 3) return `⚡ ${hoursLeft}h`;
    return '📅 Dzisiaj';
  }
  
  if (isTomorrow(dueDate)) return '📆 Jutro';
  
  const daysUntil = differenceInDays(dueDate, now);
  if (daysUntil <= 7) return `🗓️ ${daysUntil}d`;
  
  return `📋 ${daysUntil}d`;
}

/**
 * Check if a task should show a "burning" animation
 */
export function shouldShowUrgentAnimation(dueDateString: string): boolean {
  const dueDate = parseISO(dueDateString);
  const now = new Date();
  
  // Show animation for overdue or due within 3 hours
  if (isPast(dueDate)) return true;
  if (isToday(dueDate)) {
    const hoursLeft = differenceInHours(dueDate, now);
    return hoursLeft < 3;
  }
  
  return false;
}