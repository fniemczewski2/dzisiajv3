// lib/taskRecurrence.ts
//
// Pola zadania cyklicznego. Nowa reguła trafia do `recurrence`; stare pola
// (repeat_days, recurring_until) wypełniamy zgodnie z nią, żeby starsze
// miejsca w kodzie i eksport danych nadal coś rozumiały.

import type { Task } from "@/types/tasks";
import { normalizeRule, withMonthDay, type RecurrenceRule } from "@/supabase/functions/_shared/recurrence";

/** Odpowiednik reguły w starym polu „co N dni” – tylko tam, gdzie da się go wyrazić. */
function legacyRepeatDays(rule: RecurrenceRule): number | null {
  if (rule.freq === "daily") return rule.interval;
  if (rule.freq === "weekly" && !rule.byWeekday?.length) return rule.interval * 7;
  return null;
}

/**
 * Pola zadania dla reguły. `dueDate` – termin zadania: z niego bierzemy dzień
 * miesiąca, żeby zadanie „31.” po krótszym miesiącu wracało na 31.
 */
export function taskRecurrenceFields(rule: RecurrenceRule | null, dueDate?: string | null): Partial<Task> {
  if (!rule) return { is_recurring: false, recurrence: null, repeat_days: null, recurring_until: null };
  return {
    is_recurring: true,
    recurrence: withMonthDay(rule, dueDate),
    repeat_days: legacyRepeatDays(rule),
    recurring_until: rule.until ?? null,
  };
}

/** Reguła zadania: `recurrence`, a dla starszych zadań – co `repeat_days` dni. */
export function taskRule(task: Pick<Task, "is_recurring" | "recurrence" | "repeat_days" | "recurring_until">): RecurrenceRule | null {
  if (!task.is_recurring) return null;
  const rule = normalizeRule(task.recurrence);
  if (rule) return rule;
  if (task.repeat_days && task.repeat_days > 0) {
    return { freq: "daily", interval: task.repeat_days, until: task.recurring_until ?? null };
  }
  return null;
}
