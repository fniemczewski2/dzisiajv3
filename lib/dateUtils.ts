import { isSameDay, parseISO } from "date-fns";
import { Event } from "../types";

export const formatDate = (date: Date): string =>
  date.toISOString().split("T")[0];

export const formatTime = (timestamp: string, includeDate = false): string => {
  // Handle both "2026-01-22 23:59:00+00" and "2026-01-22T23:59:00+00"
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
  // Input: "2026-01-22T23:59" or "2026-01-22T23:59:59"
  // Output: "2026-01-22T23:59:00+00" (with T separator)
  
  let cleanDateTime = localDateTime;
  
  // Ensure we have seconds
  const parts = cleanDateTime.split(":");
  if (parts.length === 2) {
    // No seconds, add them
    cleanDateTime += ":00";
  }
  
  // Return in format with T separator and +00 timezone
  return `${cleanDateTime}+00`;
};

// Helper to parse event timestamp WITHOUT timezone conversion
// Treats stored time as the display time (ignores timezone)
export const parseEventDate = (timestamp: string): Date => {
  // Handle both "2026-01-22 23:59:00+00" and "2026-01-22T23:59:00+00"
  let cleanTimestamp = timestamp
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

// Convert Date to timestamp format "2026-01-22T23:59:00+00"
export const dateToTimestamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  // Use T separator for consistency
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00`;
};

// Check if event spans the selected date
export const eventSpansDate = (event: Event, selectedDate: Date): boolean => {
  const eventStart = parseEventDate(event.start_time);
  const eventEnd = parseEventDate(event.end_time);
  
  // Normalize times to just dates for comparison
  const selectedDateOnly = new Date(selectedDate);
  selectedDateOnly.setHours(0, 0, 0, 0);
  
  const eventStartDateOnly = new Date(eventStart);
  eventStartDateOnly.setHours(0, 0, 0, 0);
  
  const eventEndDateOnly = new Date(eventEnd);
  eventEndDateOnly.setHours(0, 0, 0, 0);
  
  // Check if selected date falls within the event's date range
  return selectedDateOnly >= eventStartDateOnly && selectedDateOnly <= eventEndDateOnly;
};

// Convert datetime-local value to proper format for editing
export const getLocalDateTimeValue = (timestamp: string): string => {
  const date = parseEventDate(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
