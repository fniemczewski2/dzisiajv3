// lib/eventUtils.ts
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
} from "date-fns";
import { Event } from "../types";
import { getAppDate, parseEventDate, dateToTimestamp } from "./dateUtils";

export function expandRepeatingEvents(
  events: Event[],
  start?: Date,
  end?: Date
): Event[] {
  const rangeStart = start ?? new Date(getAppDate() + "T00:00:00");
  const rangeEnd = end ?? new Date(getAppDate() + "T23:59:59");

  const result: Event[] = [];

  for (const event of events) {
    const originalStart = parseEventDate(event.start_time);
    const originalEnd = parseEventDate(event.end_time);
    const repeat = event.repeat || "none";

    if (repeat === "none") {
      if (originalEnd >= rangeStart && originalStart <= rangeEnd) {
        result.push(event);
      }
    } else {
      let currentStart = new Date(originalStart);

      while (currentStart < rangeStart) {
        currentStart =
          repeat === "weekly"
            ? addDays(currentStart, 7)
            : repeat === "monthly"
            ? addMonths(currentStart, 1)
            : repeat === "yearly"
            ? addYears(currentStart, 1)
            : addDays(currentStart, 1);
      }

      while (currentStart <= rangeEnd) {
        const duration = differenceInCalendarDays(originalEnd, originalStart);
        const instanceStart = new Date(currentStart);
        const instanceEnd = addDays(instanceStart, duration);

        const instanceId = `${event.id}_${instanceStart
          .toISOString()
          .split("T")[0]}`;

        result.push({
          ...event,
          id: instanceId,
          start_time: dateToTimestamp(instanceStart),
          end_time: dateToTimestamp(instanceEnd),
        });

        currentStart =
          repeat === "weekly"
            ? addDays(currentStart, 7)
            : repeat === "monthly"
            ? addMonths(currentStart, 1)
            : repeat === "yearly"
            ? addYears(currentStart, 1)
            : addDays(currentStart, 1);
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