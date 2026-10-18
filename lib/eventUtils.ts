// lib/eventUtils.ts

import { addDays, differenceInCalendarDays, format } from "date-fns";
import { normalizeRule, occurrencesBetween, ruleFromLegacyRepeat, type RecurrenceRule } from "@/shared/recurrence";
import { Event } from "@/types/events";
import { getAppDate, parseEventDate, dateToTimestamp } from "./dateUtils";

/** Reguła wydarzenia: nowe pole `recurrence`, a przy starszych wpisach – `repeat`. */
export function eventRule(event: Pick<Event, "repeat" | "recurrence">): RecurrenceRule | null {
  return normalizeRule(event.recurrence) ?? ruleFromLegacyRepeat(event.repeat);
}

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

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

export function expandRepeatingEvents(events: Event[], start?: Date, end?: Date): Event[] {
  const rangeStart = start ?? new Date(`${getAppDate()}T00:00:00`);
  const rangeEnd = end ?? new Date(`${getAppDate()}T23:59:59`);

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
        rangeStart,
        rangeEnd
      );
      result.push(...repeatingInstances);
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
