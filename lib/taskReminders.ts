// lib/taskReminders.ts
//
// Przypomnienia o zadaniu (tabela task_reminders). W formularzu trzymamy je
// jako wartości pola datetime-local („2026-10-12T09:00”), ale TA WARTOŚĆ JEST
// ZAWSZE CZASEM WARSZAWSKIM (Europe/Warsaw) – niezależnie od strefy czasowej
// ustawionej w systemie/przeglądarce użytkownika. W bazie trzymamy ją jako
// timestamptz (prawdziwy moment w czasie, UTC). Cron (edge function
// process-notifications, typ task_reminder) działa w UTC i porównuje
// remind_at z `now` bez żadnej dodatkowej konwersji – to jest poprawne,
// bo timestamptz już niesie absolutny moment w czasie; cała konwersja
// lokalny-czas-Warszawy ↔ UTC musi się odbyć TUTAJ, przy zapisie/odczycie.
//
// Nie polegamy na `new Date(string)` dla wartości bez offsetu – JS parsuje
// taki string w strefie czasowej ŚRODOWISKA URUCHOMIENIA (przeglądarka może
// mieć systemowy zegar w innej strefie niż Polska), co dawało błędne
// przesunięcie (np. różnicę dokładnie 1h/2h – offset CET/CEST). Zamiast tego
// jawnie liczymy offset Warszawy przez Intl.DateTimeFormat (uwzględnia
// automatycznie czas letni/zimowy, bez twardego kodowania „+1”).

import { MAX_TASK_REMINDERS } from "@/config/limits";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addHours } from "date-fns";

const LOCAL_FORMAT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const WARSAW_TZ = "Europe/Warsaw";

interface WarsawParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function warsawParts(date: Date): WarsawParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: WARSAW_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Intl z hour12:false zwraca "24" dla północy zamiast "00" – sprowadzamy do 0-23.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Przesunięcie Warszawy względem UTC w minutach dla danej chwili (CET +60 / CEST +120). */
function warsawOffsetMinutes(utcMs: number): number {
  const p = warsawParts(new Date(utcMs));
  const asIfUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asIfUTC - utcMs) / 60_000);
}

/**
 * Podana data i godzina, interpretowane jako czas warszawski, jako absolutna
 * chwila (Date, UTC). Dwa przejścia offsetu chronią przed błędem tuż przy
 * granicy zmiany czasu letni/zimowy (ostatnia niedziela marca/października).
 */
export function warsawDateTimeToUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
  const approx = Date.UTC(year, month - 1, day, hour, minute);
  const offset1 = warsawOffsetMinutes(approx);
  const real = approx - offset1 * 60_000;
  const offset2 = warsawOffsetMinutes(real);
  return new Date(offset2 === offset1 ? real : approx - offset2 * 60_000);
}

/** Dzień kalendarzowy w Warszawie dla danej chwili. */
function warsawDay(date: Date): { year: number; month: number; day: number } {
  const p = warsawParts(date);
  return { year: p.year, month: p.month, day: p.day };
}

/** Dodaje `days` dni do dnia kalendarzowego (z poprawnym przechodzeniem przez koniec miesiąca/roku). */
function addDaysToWarsawDay(
  d: { year: number; month: number; day: number },
  days: number
): { year: number; month: number; day: number } {
  const rolled = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: rolled.getUTCFullYear(), month: rolled.getUTCMonth() + 1, day: rolled.getUTCDate() };
}

export interface TaskReminderRow {
  id: string;
  task_id: string | number;
  remind_at: string;
  sent_at: string | null;
}

/** Absolutna chwila → wartość pola datetime-local w czasie warszawskim. */
export function toLocalInput(date: Date): string {
  const p = warsawParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Wartość pola datetime-local (czas warszawski) → ISO (UTC). null, gdy wartość jest niepoprawna. */
function localInputToISO(value: string): string | null {
  const m = LOCAL_FORMAT_RE.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = warsawDateTimeToUTC(Number(y), Number(mo), Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Szybkie wybory. Liczone od „teraz” i od terminu zadania – wszystko w czasie warszawskim. */
export function reminderPresets(now: Date, dueDate?: string | null): Array<{ label: string; value: string }> {
  const tomorrow = addDaysToWarsawDay(warsawDay(now), 1);
  const presets = [
    { label: "Za godzinę", value: toLocalInput(addHours(now, 1)) },
    {
      label: "Jutro 9:00",
      value: toLocalInput(warsawDateTimeToUTC(tomorrow.year, tomorrow.month, tomorrow.day, 9, 0)),
    },
  ];
  if (dueDate) {
    const [y, m, d] = dueDate.split("-").map(Number);
    if (y && m && d) {
      const due = warsawDateTimeToUTC(y, m, d, 9, 0);
      const dayBefore = warsawDateTimeToUTC(y, m, d - 1, 18, 0);
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
