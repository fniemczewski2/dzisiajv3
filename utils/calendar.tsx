import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  type Day,
} from "date-fns";
import { pl } from "date-fns/locale";

export function generateCalendarDays(
  date: Date,
  weekStartsOn: Day = 1
): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const start = startOfWeek(monthStart, { locale: pl, weekStartsOn });
  const end = endOfWeek(monthEnd, { locale: pl, weekStartsOn });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}
