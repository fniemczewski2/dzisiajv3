// lib/eventUtils.ts
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  isSameDay,
  parseISO,
} from "date-fns";
import { Event } from "../types";
import { getAppDate } from "./dateUtils";

export function expandRepeatingEvents(
  events: Event[],
  start?: Date,
  end?: Date
): Event[] {
  const rangeStart = start ?? new Date(getAppDate());
  const rangeEnd = end ?? new Date(getAppDate());

  const result: Event[] = [];

  for (const event of events) {
    const originalStart = parseISO(event.start_time);
    const originalEnd = parseISO(event.end_time);
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

        result.push({
          ...event,
          id: `${event.id}_${instanceStart.toISOString()}`,
          start_time: instanceStart.toISOString(),
          end_time: instanceEnd.toISOString(),
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
    const eventDate = parseISO(event.start_time);
    return isSameDay(eventDate, day);
  });
};