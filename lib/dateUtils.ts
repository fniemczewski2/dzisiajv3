import { isSameDay, parseISO } from "date-fns";
import { Event } from "../types";

export const formatDate = (date: Date): string =>
  date.toISOString().split("T")[0];

export const formatTime = (timestamp: string, includeDate = false): string => {
  const cleanTimestamp = timestamp.replace(/\+\d{2}$/, "").replace("T", " ").slice(0, 19);
  const [datePart, timePart] = cleanTimestamp.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes] = timePart.split(":");
  
  if (includeDate) {
    return `${day}.${month} ${hours}:${minutes}`;
  }
  return `${hours}:${minutes}`;
};

export const localDateTimeToISO = (localDateTime: string): string => {
  // Just append seconds and milliseconds, keep the exact time
  return `${localDateTime}:00.000Z`;
};

export const getMonthDays = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};

export const sameDay = (d1: Date, d2: Date): boolean =>
  d1.toDateString() === d2.toDateString();

export const daysBetween = (start: Date, end: Date): number =>
  Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

export const getAppDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());
};

export const getAppDateTime = () => {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return new Date(formatter.format(new Date()).replace(" ", "T"));
};