import { isSameDay, parseISO } from "date-fns";
import { Event } from "../types";

export const formatDate = (date: Date): string =>
  date.toISOString().split("T")[0];

export const getMonthDays = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};

export const getEventsForDay = (events: Event[], day: Date): Event[] => {
  return events.filter((event) => {
    const eventDate = parseISO(event.start_time);
    return isSameDay(eventDate, day);
  });
};

export const sameDay = (d1: Date, d2: Date): boolean =>
  d1.toDateString() === d2.toDateString();

export const daysBetween = (start: Date, end: Date): number =>
  Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
