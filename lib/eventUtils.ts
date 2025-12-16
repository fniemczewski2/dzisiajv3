// lib/eventUtils.ts
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  isSameDay,
} from "date-fns";
import { Event } from "../types";
import { getAppDate } from "./dateUtils";

// Helper to parse timestamp format "2026-01-22 23:59:00+00" or "2026-01-22T23:59:00+00" to Date
const parseEventTimestamp = (timestamp: string): Date => {
  // Handle both formats with space or T separator
  const cleanTimestamp = timestamp
    .replace(" ", "T")
    .replace(/\+\d{2}$/, "")
    .split(".")[0];
  
  const [datePart, timePart] = cleanTimestamp.split("T");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes, seconds] = (timePart || "00:00:00").split(":");
  
  // Create date in LOCAL timezone (no conversion)
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours || "0"),
    parseInt(minutes || "0"),
    parseInt(seconds || "0")
  );
};

// Helper to convert Date to timestamp format "2026-01-22T23:59:00+00"
const dateToTimestamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  // Use T separator for consistency
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00`;
};

export function expandRepeatingEvents(
  events: Event[],
  start?: Date,
  end?: Date
): Event[] {
  const rangeStart = start ?? new Date(getAppDate() + "T00:00:00");
  const rangeEnd = end ?? new Date(getAppDate() + "T23:59:59");

  const result: Event[] = [];

  for (const event of events) {
    const originalStart = parseEventTimestamp(event.start_time);
    const originalEnd = parseEventTimestamp(event.end_time);
    const repeat = event.repeat || "none";

    if (repeat === "none") {
      // Non-repeating event: include if it overlaps with range
      if (originalEnd >= rangeStart && originalStart <= rangeEnd) {
        result.push(event);
      }
    } else {
      // Repeating event: generate instances
      let currentStart = new Date(originalStart);

      // Fast-forward to first occurrence within or before range
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

      // Generate instances within range
      while (currentStart <= rangeEnd) {
        const duration = differenceInCalendarDays(originalEnd, originalStart);
        const instanceStart = new Date(currentStart);
        const instanceEnd = addDays(instanceStart, duration);

        // Create synthetic ID for this instance
        const instanceId = `${event.id}_${instanceStart.toISOString().split('T')[0]}`;

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
    const eventStart = parseEventTimestamp(event.start_time);
    const eventEnd = parseEventTimestamp(event.end_time);
    
    // Normalize to date-only comparison
    const dayOnly = new Date(day);
    dayOnly.setHours(0, 0, 0, 0);
    
    const eventStartOnly = new Date(eventStart);
    eventStartOnly.setHours(0, 0, 0, 0);
    
    const eventEndOnly = new Date(eventEnd);
    eventEndOnly.setHours(0, 0, 0, 0);
    
    // Check if event spans this day
    return dayOnly >= eventStartOnly && dayOnly <= eventEndOnly;
  });
};
