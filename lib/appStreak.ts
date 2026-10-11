// lib/appStreak.ts

import { addDays, format, parseISO } from "date-fns";

export function computeStreak(days: readonly string[], today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : format(addDays(parseISO(today), -1), "yyyy-MM-dd");
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = format(addDays(parseISO(cursor), -1), "yyyy-MM-dd");
  }
  return streak;
}
