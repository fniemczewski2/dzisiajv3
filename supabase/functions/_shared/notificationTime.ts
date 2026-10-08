// supabase/functions/_shared/notificationTime.ts
//
// Obliczenia czasu dla powiadomień – wydzielone, żeby dało się je testować.

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Dzień tygodnia (0 = poniedziałek … 6 = niedziela) dla daty "RRRR-MM-DD" w Polsce.
 * Wcześniej liczony jako `now + currentHour godzin`, co od południa dawało już następny dzień.
 */
export function weekdayIndexPL(dateStr: string): number {
  const utcNoon = new Date(`${dateStr}T12:00:00Z`);
  return (utcNoon.getUTCDay() + 6) % 7;
}

/**
 * Granice dnia "RRRR-MM-DD" w Polsce jako ISO UTC – do porównań z kolumnami
 * timestamptz (np. events.start_time). Uwzględnia czas letni i zimowy.
 */
/** Przesunięcie czasu w Polsce względem UTC (ms) w danej chwili. */
function warsawOffsetAt(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const p: Record<string, number> = {};
  for (const part of parts) if (part.type !== "literal") p[part.type] = Number(part.value);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** Chwila (UTC) północy danego dnia w Polsce – przesunięcie liczone dla samej północy. */
function warsawMidnightUTC(dateStr: string): number {
  const wall = Date.parse(`${dateStr}T00:00:00Z`);
  const guess = wall - warsawOffsetAt(wall);
  return wall - warsawOffsetAt(guess);
}

/**
 * Granice dnia "RRRR-MM-DD" w Polsce jako ISO UTC – do porównań z kolumnami
 * timestamptz (np. events.start_time). Dzień zmiany czasu ma 23 lub 25 godzin.
 */
export function plDayBoundsUTC(dateStr: string): { start: string; end: string } {
  const next = new Date(Date.parse(`${dateStr}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  return { start: new Date(warsawMidnightUTC(dateStr)).toISOString(), end: new Date(warsawMidnightUTC(next)).toISOString() };
}

export type EventReminder = "5min" | "1day" | "7days";

/**
 * Który przypomnienie wysłać dla wydarzenia (start jako ISO z bazy).
 * Porównujemy chwile w czasie, nie napisy: wcześniej tekst z bazy
 * ("…T10:00:00+00:00") porównywany z "… 14:00:00" dawał „Za tydzień” dla
 * wydarzenia jutro, a przypomnienie 5 minut przed praktycznie nie działało.
 */
export function eventReminderType(startIso: string, nowMs: number, alreadySent: ReadonlySet<string>): EventReminder | null {
  const start = Date.parse(startIso);
  if (Number.isNaN(start) || start <= nowMs) return null;
  const until = start - nowMs;
  if (until <= 5 * MINUTE_MS) return alreadySent.has("5min") ? null : "5min";
  if (until <= DAY_MS) return alreadySent.has("1day") ? null : "1day";
  if (until <= 7 * DAY_MS) return alreadySent.has("7days") ? null : "7days";
  return null;
}
