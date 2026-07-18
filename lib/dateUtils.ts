import { Event } from "@/types/events";

export const formatTime = (timestamp: string, includeDate = false): string => {
  const cleanTimestamp = timestamp.replace(/\+\d{2}$/, "").replace("T", " ").slice(0, 19);
  const [datePart, timePart] = cleanTimestamp.split(" ");
  const [, month, day] = datePart.split("-");
  const [hours, minutes] = timePart.split(":");
  
  if (includeDate) {
    return `${day}.${month} ${hours}:${minutes}`;
  }
  return `${hours}:${minutes}`;
};

export const localDateTimeToISO = (localDateTime: string): string => {
  
  let cleanDateTime = localDateTime;
  
  const parts = cleanDateTime.split(":");
  if (parts.length === 2) {
    cleanDateTime += ":00";
  }
  
  return `${cleanDateTime}+00`;
};


export const parseEventDate = (timestamp: string): Date => {
  const cleanTimestamp = timestamp
    .replace(" ", "T")
    .replace(/\+\d{2}$/, "")
    .split(".")[0];
  
  const [datePart, timePart] = cleanTimestamp.split("T");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes, seconds] = (timePart || "00:00:00").split(":");
  
  return new Date(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hours || "0", 10),
    Number.parseInt(minutes || "0", 10),
    Number.parseInt(seconds || "0", 10)
  );
};

export const dateToTimestamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00`;
};

export const eventSpansDate = (event: Event, selectedDate: Date): boolean => {
  const eventStart = parseEventDate(event.start_time);
  const eventEnd = parseEventDate(event.end_time);
  
  const selectedDateOnly = new Date(selectedDate);
  selectedDateOnly.setHours(0, 0, 0, 0);
  
  const eventStartDateOnly = new Date(eventStart);
  eventStartDateOnly.setHours(0, 0, 0, 0);
  
  const eventEndDateOnly = new Date(eventEnd);
  eventEndDateOnly.setHours(0, 0, 0, 0);
  
  return selectedDateOnly >= eventStartDateOnly && selectedDateOnly <= eventEndDateOnly;
};

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