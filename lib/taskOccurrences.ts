// lib/taskOccurrences.ts
//
// Podgląd przyszłych wystąpień zadań cyklicznych. Zadanie cykliczne to jeden
// wiersz z bieżącym terminem – kolejne wystąpienia liczymy tym samym silnikiem
// reguł co wydarzenia, tylko do wyświetlenia. Prawdziwe zadanie na nowy termin
// powstaje dopiero po wykonaniu bieżącego (przesuwa je process-reminders).

import { MAX_TASK_OCCURRENCES } from "@/config/limits";
import type { Task } from "@/types/tasks";
import { taskRule } from "./taskRecurrence";
import { occurrencesBetween, withMonthDay } from "@/shared/recurrence";

export interface TaskOccurrencePreview {
  /** Unikalny klucz: id zadania + dzień. */
  key: string;
  /** Dzień wystąpienia (yyyy-MM-dd). */
  date: string;
  task: Task;
}

/** Bezpiecznik: codzienne zadanie w widoku miesiąca to ~31 podglądów. */

/**
 * Przyszłe wystąpienia w [from, to]. Pomijamy bieżący termin (to prawdziwe
 * zadanie na liście) i wszystko do dziś włącznie – zaległe zadanie samo
 * reprezentuje zaległość, a podgląd przeszłych dni niczego nie wnosi.
 */
export function projectTaskOccurrences(
  tasks: readonly Task[],
  from: string,
  to: string,
  today: string
): TaskOccurrencePreview[] {
  const previews: TaskOccurrencePreview[] = [];
  for (const task of tasks) {
    if (!task.due_date || task.status === "waiting_for_acceptance") continue;
    const rule = taskRule(task);
    if (!rule) continue;
    const anchored = rule.monthDay ? rule : withMonthDay(rule, task.due_date);
    if (!anchored) continue;

    const after = task.due_date > today ? task.due_date : today;
    const days = occurrencesBetween(task.due_date, anchored, from, to)
      .filter((day) => day > after)
      .slice(0, MAX_TASK_OCCURRENCES);
    for (const date of days) previews.push({ key: `${task.id}@${date}`, date, task });
  }
  return previews.sort((a, b) => a.date.localeCompare(b.date) || a.task.title.localeCompare(b.task.title, "pl"));
}

/** Podglądy pogrupowane po dniu. */
export function groupPreviewsByDate(previews: readonly TaskOccurrencePreview[]): Map<string, TaskOccurrencePreview[]> {
  const map = new Map<string, TaskOccurrencePreview[]>();
  for (const p of previews) map.set(p.date, [...(map.get(p.date) ?? []), p]);
  return map;
}
