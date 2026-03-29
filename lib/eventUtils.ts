// lib/eventUtils.ts
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
} from "date-fns";
import { Event } from "../types";
import { getAppDate, parseEventDate, dateToTimestamp } from "./dateUtils";

const getNextDate = (currentDate: Date, repeat: string): Date => {
  switch (repeat) {
    case "weekly":
      return addDays(currentDate, 7);
    case "monthly":
      return addMonths(currentDate, 1);
    case "yearly":
      return addYears(currentDate, 1);
    default:
      return addDays(currentDate, 1);
  }
};

const getFirstInstanceInRange = (start: Date, rangeStart: Date, repeat: string): Date => {
  let currentStart = new Date(start);
  while (currentStart < rangeStart) {
    currentStart = getNextDate(currentStart, repeat);
  }
  return currentStart;
};

const generateRepeatingInstances = (
  event: Event,
  originalStart: Date,
  originalEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
): Event[] => {
  const instances: Event[] = [];
  const repeat = event.repeat || "none";
  
  let currentStart = getFirstInstanceInRange(originalStart, rangeStart, repeat);
  const durationInDays = differenceInCalendarDays(originalEnd, originalStart);

  while (currentStart <= rangeEnd) {
    const instanceStart = new Date(currentStart);
    const instanceEnd = addDays(instanceStart, durationInDays);

    const dateString = instanceStart.toISOString().split("T")[0];
    const instanceId = `${event.id}_${dateString}`;

    instances.push({
      ...event,
      id: instanceId,
      start_time: dateToTimestamp(instanceStart),
      end_time: dateToTimestamp(instanceEnd),
    });

    currentStart = getNextDate(currentStart, repeat);
  }

  return instances;
};

export function expandRepeatingEvents(
  events: Event[],
  start?: Date,
  end?: Date
): Event[] {
  const rangeStart = start ?? new Date(`${getAppDate()}T00:00:00`);
  const rangeEnd = end ?? new Date(`${getAppDate()}T23:59:59`);

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
      const repeatingInstances = generateRepeatingInstances(
        event,
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