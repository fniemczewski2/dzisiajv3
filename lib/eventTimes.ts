// lib/eventTimes.ts
//
// Domyślne godziny w formularzu wydarzenia. Wartości w formacie pól
// <input type="datetime-local">: "yyyy-MM-dd'T'HH:mm" (czas lokalny).

import { addMinutes, differenceInMinutes, format, isSameDay, isValid, parse } from "date-fns";

export const LOCAL_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";
export const LOCAL_DATE_FORMAT = "yyyy-MM-dd";

/** Domyślna długość wydarzenia, które nie jest całodniowe. */
export const DEFAULT_EVENT_DURATION_MIN = 60;

/** Szybkie opcje długości w formularzu. */
export const QUICK_EVENT_DURATIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 h" },
  { minutes: 120, label: "2 h" },
] as const;

/** Godzina startu dla wydarzeń planowanych na inny dzień niż dziś. */
const OTHER_DAY_START_HOUR = 9;

function parseLocal(value: string): Date | null {
  const d = parse(value, LOCAL_DATETIME_FORMAT, new Date());
  return isValid(d) ? d : null;
}

/** Przesuwa wartość pola datetime-local o podaną liczbę minut (także przez północ). */
export function addMinutesToLocal(value: string, minutes: number): string {
  const d = parseLocal(value);
  return d ? format(addMinutes(d, minutes), LOCAL_DATETIME_FORMAT) : value;
}

/** Długość w minutach między dwiema wartościami datetime-local (null, gdy któraś jest niepoprawna). */
export function durationBetween(start: string, end: string): number | null {
  const s = parseLocal(start);
  const e = parseLocal(end);
  return s && e ? differenceInMinutes(e, s) : null;
}

/**
 * Domyślny początek wydarzenia nie-całodniowego w wybranym dniu:
 *  - dziś: najbliższa pełna godzina (najpóźniej 23:00),
 *  - inny dzień: 9:00.
 * Wcześniej formularz ustawiał godzinę z daty klikniętej w kalendarzu,
 * czyli zwykle 00:00.
 */
export function defaultTimedStart(day: Date, now: Date = new Date()): string {
  const start = new Date(day);
  if (isSameDay(day, now)) {
    start.setHours(Math.min(now.getHours() + 1, 23), 0, 0, 0);
  } else {
    start.setHours(OTHER_DAY_START_HOUR, 0, 0, 0);
  }
  return format(start, LOCAL_DATETIME_FORMAT);
}
