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
    timeZone: "Europe/Warsaw",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
  return {
    start: new Date(warsawMidnightUTC(dateStr)).toISOString(),
    end: new Date(warsawMidnightUTC(next)).toISOString(),
  };
}

export type EventReminder = "5min" | "1day" | "7days";

const HOUR_MS = 60 * MINUTE_MS;
/**
 * Ile czasu po właściwej chwili przypomnienie jest jeszcze aktualne.
 * Cron chodzi co minutę; zapas pokrywa pojedyncze opóźnienia. Po tym czasie
 * przypomnienie przepada – lepiej żadne niż spóźnione i mylące.
 */
export const REMINDER_TOLERANCE_MS = 15 * MINUTE_MS;

/**
 * Wydarzenia są zapisane jako czas ścienny w Polsce z dopiskiem „+00”
 * (np. „2026-10-12T15:00:00+00” = 15:00 w Warszawie). Zwraca prawdziwą
 * chwilę (ms UTC). Wcześniej traktowaliśmy ten zapis jak UTC, więc wszystkie
 * przypomnienia przychodziły o 1 h (zima) lub 2 h (lato) za późno.
 */
export function warsawWallClockToInstant(stored: string): number {
  const wall = Date.parse(`${stored.replace(" ", "T").slice(0, 19)}Z`);
  if (Number.isNaN(wall)) return Number.NaN;
  const guess = wall - warsawOffsetAt(wall);
  return wall - warsawOffsetAt(guess);
}

/** Obecna chwila zapisana jak w bazie (czas ścienny w Polsce z „+00”) – do zapytań. */
export function warsawWallClockNow(nowMs: number): string {
  return new Date(nowMs + warsawOffsetAt(nowMs)).toISOString().slice(0, 19) + "+00:00";
}

/** Wydarzenie całodniowe: 00:00–23:59 czasu ściennego. */
export function isAllDayStored(start: string, end: string | null | undefined): boolean {
  const s = start.replace(" ", "T").slice(11, 16);
  const e = (end ?? "").replace(" ", "T").slice(11, 16);
  return s === "00:00" && e === "23:59";
}

/**
 * Granice dnia „RRRR-MM-DD” w zapisie, w jakim są wydarzenia (czas ścienny
 * w Polsce z „+00”). Do events.start_time używaj tego, nie plDayBoundsUTC.
 */
export function wallClockDayBounds(dateStr: string): { start: string; end: string } {
  const next = new Date(Date.parse(`${dateStr}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  return { start: `${dateStr}T00:00:00+00:00`, end: `${next}T00:00:00+00:00` };
}

type Window = [EventReminder, number];

/**
 * Momenty przypomnień (ile przed startem). Każde przypomnienie ma wąskie okno:
 * wysyłamy je tylko, gdy do startu zostało ok. tyle, ile trzeba – a nie
 * „wszystko poniżej progu”. Dzięki temu wydarzenie dodane na dziś nie dostaje
 * „Jutro: …”, a dodane na za 3 dni – „Za tydzień: …”.
 * Wydarzenia całodniowe zaczynają się o północy, więc ich przypomnienia
 * przychodzą o 18:00 dzień (i tydzień) wcześniej, a „Zaraz” nie ma sensu.
 */
const TIMED_WINDOWS: readonly Window[] = [
  ["5min", 5 * MINUTE_MS],
  ["1day", DAY_MS],
  ["7days", 7 * DAY_MS],
];
const ALL_DAY_WINDOWS: readonly Window[] = [
  ["1day", 6 * HOUR_MS],
  ["7days", 7 * DAY_MS - 18 * HOUR_MS],
];

/**
 * Które przypomnienie wysłać teraz (albo null). `start`/`end` – wartości
 * z bazy (czas ścienny w Polsce). „5min” obejmuje całe ostatnie 5 minut
 * (także wydarzenie dodane chwilę przed startem); pozostałe tylko okno
 * [moment, moment + tolerancja].
 */
export function eventReminderType(
  start: string,
  nowMs: number,
  alreadySent: ReadonlySet<string>,
  end?: string | null
): EventReminder | null {
  const startMs = warsawWallClockToInstant(start);
  if (Number.isNaN(startMs) || startMs <= nowMs) return null;
  const until = startMs - nowMs;
  const windows = isAllDayStored(start, end) ? ALL_DAY_WINDOWS : TIMED_WINDOWS;

  for (const [type, lead] of windows) {
    if (alreadySent.has(type)) continue;
    const lower = type === "5min" ? 0 : lead - REMINDER_TOLERANCE_MS;
    if (until > lower && until <= lead) return type;
  }
  return null;
}
