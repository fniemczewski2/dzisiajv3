// lib/eventTimes.ts

import { addMinutes, differenceInMinutes, format, isSameDay, isValid, parse } from "date-fns";

export const LOCAL_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";
export const LOCAL_DATE_FORMAT = "yyyy-MM-dd";

export const DEFAULT_EVENT_DURATION_MIN = 60;

export const QUICK_EVENT_DURATIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 h" },
  { minutes: 120, label: "2 h" },
] as const;

const OTHER_DAY_START_HOUR = 9;

function parseLocal(value: string): Date | null {
  const d = parse(value, LOCAL_DATETIME_FORMAT, new Date());
  return isValid(d) ? d : null;
}

export function addMinutesToLocal(value: string, minutes: number): string {
  const d = parseLocal(value);
  return d ? format(addMinutes(d, minutes), LOCAL_DATETIME_FORMAT) : value;
}

export function durationBetween(start: string, end: string): number | null {
  const s = parseLocal(start);
  const e = parseLocal(end);
  return s && e ? differenceInMinutes(e, s) : null;
}

export function defaultTimedStart(day: Date, now: Date = new Date()): string {
  const start = new Date(day);
  if (isSameDay(day, now)) {
    start.setHours(Math.min(now.getHours() + 1, 23), 0, 0, 0);
  } else {
    start.setHours(OTHER_DAY_START_HOUR, 0, 0, 0);
  }
  return format(start, LOCAL_DATETIME_FORMAT);
}
