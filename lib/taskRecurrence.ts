// lib/taskRecurrence.ts
//
// Pola zadania cyklicznego. Nowa reguła trafia do `recurrence`; stare pola
// (repeat_days, recurring_until) wypełniamy zgodnie z nią, żeby starsze
// miejsca w kodzie i eksport danych nadal coś rozumiały.

import type { Task } from "@/types/tasks";
import { normalizeRule, type RecurrenceRule } from "@/supabase/functions/_shared/recurrence";

export function taskRecurrenceFields(rule: RecurrenceRule | null): Partial<Task> {
  if (!rule) return { is_recurring: false, recurrence: null, repeat_days: null, recurring_until: null };
  return {
    is_recurring: true,
    recurrence: rule,
    repeat_days: rule.freq === "daily" ? rule.interval : rule.freq === "weekly" && !rule.byWeekday?.length ? rule.interval * 7 : null,
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
