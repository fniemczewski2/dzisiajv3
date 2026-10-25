// lib/taskReminders.ts
//
// Przypomnienia o zadaniu (tabela task_reminders). W formularzu trzymamy je
// jako wartości pola datetime-local („2026-10-12T09:00”, czas lokalny),
// w bazie jako timestamptz (prawdziwy moment w czasie). Push wysyła edge
// function process-notifications (typ task_reminder) co minutę.

import { MAX_TASK_REMINDERS } from "@/config/limits";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, addHours, format, setHours, setMinutes } from "date-fns";

const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export interface TaskReminderRow {
  id: string;
  task_id: string | number;
  remind_at: string;
  sent_at: string | null;
}

export function toLocalInput(date: Date): string {
  return format(date, LOCAL_FORMAT);
}

/** Wartość pola datetime-local → ISO (UTC). null, gdy wartość jest niepoprawna. */
function localInputToISO(value: string): string | null {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

/** Szybkie wybory. Liczone od „teraz” i od terminu zadania. */
export function reminderPresets(now: Date, dueDate?: string | null): Array<{ label: string; value: string }> {
  const presets = [
    { label: "Za godzinę", value: toLocalInput(addHours(now, 1)) },
    { label: "Jutro 9:00", value: toLocalInput(setMinutes(setHours(addDays(now, 1), 9), 0)) },
  ];
  if (dueDate) {
    const [y, m, d] = dueDate.split("-").map(Number);
    if (y && m && d) {
      const due = new Date(y, m - 1, d, 9, 0, 0);
      const dayBefore = new Date(y, m - 1, d - 1, 18, 0, 0);
      if (dayBefore > now) presets.push({ label: "Dzień przed, 18:00", value: toLocalInput(dayBefore) });
      if (due > now) presets.push({ label: "W dniu terminu, 9:00", value: toLocalInput(due) });
    }
  }
  return presets;
}

/** Komunikat błędu dla listy przypomnień albo null, gdy wszystko w porządku. */
export function validateReminders(values: readonly string[], now: Date = new Date()): string | null {
  if (values.length > MAX_TASK_REMINDERS) return `Zadanie może mieć najwyżej ${MAX_TASK_REMINDERS} przypomnień.`;
  const seen = new Set<string>();
  for (const v of values) {
    if (!v) return "Uzupełnij datę i godzinę każdego przypomnienia albo je usuń.";
    const iso = localInputToISO(v);
    if (!iso) return "Niepoprawna data przypomnienia.";
    if (new Date(iso) <= now) return "Przypomnienie musi być w przyszłości.";
    if (seen.has(v)) return "Dwa przypomnienia mają tę samą godzinę.";
    seen.add(v);
  }
  return null;
}

/** Niewysłane przypomnienia zadania jako wartości pól formularza, od najwcześniejszego. */
export async function fetchPendingReminders(supabase: SupabaseClient, taskId: string | number): Promise<string[]> {
  const { data, error } = await supabase
    .from("task_reminders")
    .select("remind_at")
    .eq("task_id", taskId)
    .is("sent_at", null)
    .order("remind_at", { ascending: true });
  if (error || !data) return [];
  return (data as Array<{ remind_at: string }>).map((r) => toLocalInput(new Date(r.remind_at)));
}

/**
 * Zastępuje niewysłane przypomnienia zadania nową listą. Wysłanych nie
 * ruszamy – zostają jako historia (i nie wracają jako ponowny push).
 */
export async function replacePendingReminders(
  supabase: SupabaseClient,
  userId: string,
  taskId: string | number,
  values: readonly string[]
): Promise<{ error: string | null }> {
  const iso = values.map(localInputToISO).filter((v): v is string => v !== null);

  const del = await supabase
    .from("task_reminders")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .is("sent_at", null);
  if (del.error) return { error: "Nie udało się zapisać przypomnień." };

  if (iso.length === 0) return { error: null };

  const ins = await supabase
    .from("task_reminders")
    .insert(iso.map((remind_at) => ({ task_id: taskId, user_id: userId, remind_at })));
  if (ins.error) {
    return {
      error: ins.error.message.includes("najwyżej") ? ins.error.message : "Nie udało się zapisać przypomnień.",
    };
  }
  return { error: null };
}
