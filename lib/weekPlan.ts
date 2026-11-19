// lib/weekPlan.ts
//
// Widok tygodnia na ekranie głównym: zakres dni (wczoraj względem dnia widoku i 5 kolejnych), podział zadań
// na zaległe i dni zakresu, wydarzenia po dniach oraz nowe terminy po przeniesieniu na inny dzień – godzina
// i czas trwania bez zmian. Daty jako „yyyy-MM-dd”, czasy w zapisie dateToTimestamp (czas lokalny z „+00”).

import { addDays, differenceInCalendarDays, format } from "date-fns";
import { pl } from "date-fns/locale";
import type { Task } from "@/types/tasks";
import type { Event } from "@/types/events";
import { dateToTimestamp, parseEventDate } from "./dateUtils";
import { eventRule } from "./eventUtils";

const WEEK_DAYS_BEFORE = 1;
const WEEK_DAYS_AFTER = 5;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_DROP_PREFIX = "day-";

/** Dzień „yyyy-MM-dd” jako lokalna północ (bez przesunięcia strefy, jak `new Date("yyyy-MM-dd")`). */
export const parseDay = (day: string): Date => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const dayOf = (date: Date): string => format(date, "yyyy-MM-dd");

/** Dni widoku tygodnia: od `anchor − WEEK_DAYS_BEFORE` do `anchor + WEEK_DAYS_AFTER`. */
export function weekDays(anchor: Date): string[] {
  const start = addDays(anchor, -WEEK_DAYS_BEFORE);
  return Array.from({ length: WEEK_DAYS_BEFORE + 1 + WEEK_DAYS_AFTER }, (_, i) => dayOf(addDays(start, i)));
}

/** Id strefy upuszczenia kolumny dnia; rozłączne z id slotów godzinowych planu dnia („slot-HH:mm”). */
export const dayDropId = (day: string): string => `${DAY_DROP_PREFIX}${day}`;

/** Dzień z id strefy upuszczenia albo null, gdy to nie jest kolumna dnia. */
export function parseDayDropId(id: string): string | null {
  if (!id.startsWith(DAY_DROP_PREFIX)) return null;
  const day = id.slice(DAY_DROP_PREFIX.length);
  return DAY_RE.test(day) ? day : null;
}

const scheduledKey = (task: Task): string => (task.scheduled_time ? task.scheduled_time.slice(11, 16) : "99:99");

export interface WeekTasks {
  /** Niewykonane zadania z terminem przed pierwszym dniem zakresu i przed dziś. */
  overdue: Task[];
  /** Zadania z terminem w zakresie, po dniach: zaplanowane wg godziny, potem pozostałe (kolejność wejściowa). */
  byDay: Record<string, Task[]>;
}

export function splitWeekTasks(tasks: readonly Task[], days: readonly string[], today: string): WeekTasks {
  const byDay: Record<string, Task[]> = Object.fromEntries(days.map((d) => [d, []]));
  const overdue: Task[] = [];
  const first = days[0];

  for (const task of tasks) {
    if (!task.due_date) continue;
    if (byDay[task.due_date]) byDay[task.due_date].push(task);
    else if (task.status !== "done" && task.due_date < first && task.due_date < today) overdue.push(task);
  }
  // Sortowanie stabilne: przy równych godzinach zostaje kolejność z useTasks (status, ustawienie sortowania).
  for (const day of days) byDay[day].sort((a, b) => scheduledKey(a).localeCompare(scheduledKey(b)));
  overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return { overdue, byDay };
}

/** Wydarzenia po dniach zakresu; wydarzenie wielodniowe trafia do każdego dnia, który obejmuje. */
export function groupEventsByDay(events: readonly Event[], days: readonly string[]): Record<string, Event[]> {
  const byDay: Record<string, Event[]> = Object.fromEntries(days.map((d) => [d, []]));
  const sorted = events.toSorted((a, b) => a.start_time.localeCompare(b.start_time));
  for (const event of sorted) {
    const start = dayOf(parseEventDate(event.start_time));
    const end = dayOf(parseEventDate(event.end_time));
    for (const day of days) {
      if (day >= start && day <= end) byDay[day].push(event);
    }
  }
  return byDay;
}

/**
 * Czy wydarzenie można przenieść na inny dzień. Nie: wirtualne urodziny/imieniny (`bday_`/`nday_`),
 * wystąpienia serii (zapis instancji zmieniłby początek całej serii) i wpisy jeszcze bez id z bazy (`temp-`).
 */
export function isMovableEvent(event: Event): boolean {
  const id = String(event.id);
  if (id.startsWith("bday_") || id.startsWith("nday_") || id.startsWith("temp-")) return false;
  return eventRule(event) === null;
}

/** Zadanie po przeniesieniu na `day`: nowy termin, godzina zaplanowania (jeśli była) bez zmian. */
export function moveTaskToDay(task: Task, day: string): Pick<Task, "due_date" | "scheduled_time"> {
  if (!task.scheduled_time) return { due_date: day, scheduled_time: task.scheduled_time ?? null };
  const time = parseEventDate(task.scheduled_time);
  const moved = parseDay(day);
  moved.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
  return { due_date: day, scheduled_time: dateToTimestamp(moved) };
}

/**
 * Wydarzenie przesunięte z kolumny `fromDay` do `toDay`: początek i koniec o tę samą liczbę dni kalendarzowych
 * (godziny i czas trwania bez zmian, także dla wydarzeń wielodniowych). Null przy nieprawidłowym zapisie czasu.
 */
export function moveEventToDay(
  event: Pick<Event, "start_time" | "end_time">,
  fromDay: string,
  toDay: string
): Pick<Event, "start_time" | "end_time"> | null {
  const start = parseEventDate(event.start_time);
  const end = parseEventDate(event.end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const shift = differenceInCalendarDays(parseDay(toDay), parseDay(fromDay));
  return { start_time: dateToTimestamp(addDays(start, shift)), end_time: dateToTimestamp(addDays(end, shift)) };
}

/** Tytuł zakresu: „18–24 listopada” albo „30 lis – 5 gru” (różne miesiące). */
export function weekRangeLabel(days: readonly string[]): string {
  const first = parseDay(days[0]);
  const last = parseDay(days.at(-1) ?? days[0]);
  if (first.getMonth() === last.getMonth()) {
    return `${format(first, "d")}–${format(last, "d MMMM", { locale: pl })}`;
  }
  return `${format(first, "d MMM", { locale: pl })} – ${format(last, "d MMM", { locale: pl })}`;
}
