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