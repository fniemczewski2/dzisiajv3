// lib/meetingPollDeadline.ts

import { APP_TIME_ZONE } from "@/lib/dateUtils";

export const POLL_AUTO_CLOSE_WORKING_HOURS = 72;

export const POLL_WORKING_WEEKDAYS = [1, 2, 3, 4] as const;

function weekdayInAppZone(date: Date): number {
  const label = date.toLocaleDateString("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
  });
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
}

export function isWorkingDay(date: Date): boolean {
  return (POLL_WORKING_WEEKDAYS as readonly number[]).includes(weekdayInAppZone(date));
}

const HOUR_MS = 60 * 60 * 1000;

export function addWorkingHours(from: Date, hours: number): Date {
  if (hours <= 0) return new Date(from);

  let cursor = new Date(from);
  let remaining = hours;

  const maxSteps = Math.ceil(hours * 7) + 24 * 7;
  let steps = 0;

  while (remaining > 0 && steps < maxSteps) {
    const next = new Date(cursor.getTime() + HOUR_MS);
    if (isWorkingDay(next)) remaining -= 1;
    cursor = next;
    steps += 1;
  }
  return cursor;
}

export function pollAutoCloseAt(createdAt: Date = new Date()): Date {
  return addWorkingHours(createdAt, POLL_AUTO_CLOSE_WORKING_HOURS);
}

export function isPollExpired(
  closesAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!closesAt) return false;
  const deadline = closesAt instanceof Date ? closesAt : new Date(closesAt);
  if (Number.isNaN(deadline.getTime())) return false;
  return now.getTime() >= deadline.getTime();
}

export function effectivePollStatus(
  poll: { status: string; closes_at?: string | null },
  now: Date = new Date()
): "open" | "closed" {
  if (poll.status !== "open") return "closed";
  return isPollExpired(poll.closes_at, now) ? "closed" : "open";
}