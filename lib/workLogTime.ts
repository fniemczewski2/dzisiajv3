// lib/workLogTime.ts
//
// Konwersje czasu wpisów pracy: wartość z pola datetime-local (czas lokalny bez strefy)
// ↔ ISO z przesunięciem strefy, które zapisujemy w bazie.

import { format } from "date-fns";

const LOCAL_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

export function toIsoWithLocalOffset(localValue: string): string {
  const date = new Date(localValue);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localValue}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Zamienia zapisany czas na wartość dla pola datetime-local w strefie użytkownika. */
export function toLocalInputValue(iso: string): string {
  return format(new Date(iso), LOCAL_INPUT_FORMAT);
}

export function nowLocalInputValue(): string {
  return format(new Date(), LOCAL_INPUT_FORMAT);
}

/** Zakończenie musi być późniejsze niż rozpoczęcie; brak zakończenia = wpis trwa. */
export function validateWorkLogRange(startIso: string, endIso: string | null | undefined): string | null {
  if (!endIso) return null;
  if (new Date(endIso) <= new Date(startIso)) return "Czas zakończenia musi być późniejszy niż rozpoczęcia.";
  return null;
}
