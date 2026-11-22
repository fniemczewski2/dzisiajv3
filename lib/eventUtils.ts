// lib/eventUtils.ts

import { addDays, differenceInCalendarDays, format } from "date-fns";
import { normalizeRule, occurrencesBetween, ruleFromLegacyRepeat, type RecurrenceRule } from "@/shared/recurrence";
import { Event, EventOverride } from "@/types/events";
import { getAppDate, parseEventDate, dateToTimestamp } from "./dateUtils";

/** Reguła wydarzenia: nowe pole `recurrence`, a przy starszych wpisach – `repeat`. */
export function eventRule(event: Pick<Event, "repeat" | "recurrence">): RecurrenceRule | null {
  return normalizeRule(event.recurrence) ?? ruleFromLegacyRepeat(event.repeat);
}

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * O tyle dni poza widok sięga generowanie wystąpień, gdy w grę wchodzą wyjątki terminów:
 * termin przeniesiony z dnia tuż przed zakresem (albo tuż za nim) musi trafić do widoku.
 * Przeniesienia wychodzą z przeciągania w planie dnia i tygodnia, więc mieszczą się w tygodniu.
 */
export const OCCURRENCE_OVERRIDE_WINDOW_DAYS = 14;

const INSTANCE_ID = /^(.+)_(\d{4}-\d{2}-\d{2})$/;

/**
 * Rozbicie id wystąpienia serii („<id serii>_<yyyy-MM-dd>”) na serię i dzień z siatki reguły.
 * Null dla zwykłego wydarzenia oraz wpisów wirtualnych (urodziny, imieniny) i jeszcze niezapisanych.
 */
export function seriesOccurrence(eventId: string): { seriesId: string; occurrenceDate: string } | null {
  const id = String(eventId);
  if (id.startsWith("bday_") || id.startsWith("nday_") || id.startsWith("temp-")) return null;
  const m = INSTANCE_ID.exec(id);
  return m ? { seriesId: m[1], occurrenceDate: m[2] } : null;
}

/** Klucz wyjątku: wystąpienie serii ma id „<id serii>_<yyyy-MM-dd>”. */
const overrideKey = (eventId: string, occurrenceDate: string): string => `${eventId}_${occurrenceDate}`;

const overrideMap = (overrides: readonly EventOverride[]): Map<string, EventOverride> =>
  new Map(overrides.map((o) => [overrideKey(o.event_id, o.occurrence_date), o]));

const overlapsRange = (event: Event, rangeStart: Date, rangeEnd: Date): boolean =>
  parseEventDate(event.end_time) >= rangeStart && parseEventDate(event.start_time) <= rangeEnd;

const generateRepeatingInstances = (
  event: Event,
  rule: RecurrenceRule,
  originalStart: Date,
  originalEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
): Event[] => {
  const durationInDays = differenceInCalendarDays(originalEnd, originalStart);
  // Od dnia, w którym zaczęłoby się wystąpienie trwające jeszcze na początku zakresu.
  const from = dayKey(addDays(rangeStart, -durationInDays));
  const days = occurrencesBetween(dayKey(originalStart), rule, from, dayKey(rangeEnd));

  return days.map((day) => {
    const [y, m, d] = day.split("-").map(Number);
    const instanceStart = new Date(
      y,
      m - 1,
      d,
      originalStart.getHours(),
      originalStart.getMinutes(),
      originalStart.getSeconds()
    );
    // Koniec liczony od godziny zakończenia oryginału (cotygodniowe 10:00–11:00 zostaje 10:00–11:00).
    const instanceEnd = addDays(instanceStart, durationInDays);
    instanceEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), originalEnd.getSeconds(), 0);
    return {
      ...event,
      id: `${event.id}_${day}`,
      start_time: dateToTimestamp(instanceStart),
      end_time: dateToTimestamp(instanceEnd),
    };
  });
};

/**
 * Wystąpienia serii w zakresie. `overrides` – wyjątki pojedynczych terminów: wystąpienie dostaje
 * czas z wyjątku (może wypaść w innym dniu), a reguła serii i pozostałe terminy zostają bez zmian.
 */
export function expandRepeatingEvents(
  events: Event[],
  start?: Date,
  end?: Date,
  overrides: readonly EventOverride[] = []
): Event[] {
  const rangeStart = start ?? new Date(`${getAppDate()}T00:00:00`);
  const rangeEnd = end ?? new Date(`${getAppDate()}T23:59:59`);
  const byKey = overrideMap(overrides);
  // Z wyjątkami szukamy szerzej i dopiero po ich zastosowaniu odrzucamy wystąpienia spoza widoku.
  const searchStart = byKey.size > 0 ? addDays(rangeStart, -OCCURRENCE_OVERRIDE_WINDOW_DAYS) : rangeStart;
  const searchEnd = byKey.size > 0 ? addDays(rangeEnd, OCCURRENCE_OVERRIDE_WINDOW_DAYS) : rangeEnd;

  const result: Event[] = [];

  for (const event of events) {
    const originalStart = parseEventDate(event.start_time);
    const originalEnd = parseEventDate(event.end_time);
    const rule = eventRule(event);

    if (!rule) {
      if (originalEnd >= rangeStart && originalStart <= rangeEnd) {
        result.push(event);
      }
    } else {
      const repeatingInstances = generateRepeatingInstances(
        event,
        rule,
        originalStart,
        originalEnd,
        searchStart,
        searchEnd
      );
      for (const instance of repeatingInstances) {
        const override = byKey.get(instance.id);
        // Odwołany termin nie pojawia się w widoku ani w kanale .ics.
        if (override?.canceled) continue;
        const resolved = override
          ? { ...instance, start_time: override.start_time, end_time: override.end_time }
          : instance;
        if (byKey.size === 0 || overlapsRange(resolved, rangeStart, rangeEnd)) result.push(resolved);
      }
    }
  }

  return result;
}

export const getEventsForDay = (events: Event[], day: Date): Event[] => {
  return events.filter((event) => {
    const eventStart = parseEventDate(event.start_time);
    const eventEnd = parseEventDate(event.end_time);

    const dayOnly = new Date(day);
    dayOnly.setHours(0, 0, 0, 0);

    const eventStartOnly = new Date(eventStart);
    eventStartOnly.setHours(0, 0, 0, 0);

    const eventEndOnly = new Date(eventEnd);
    eventEndOnly.setHours(0, 0, 0, 0);

    return dayOnly >= eventStartOnly && dayOnly <= eventEndOnly;
  });
};
