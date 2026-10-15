// lib/bulkEvents.ts
//
// Masowe dodawanie wydarzeń z wklejonej listy. Każda linia to wydarzenie:
// data albo zakres dat (formaty jak w zjazdyParser), opcjonalnie godziny
// („10:00–12:00” albo „10:00”) i nazwa – czyli wszystko, co zostanie w linii
// po usunięciu daty i godzin. Linia bez nazwy dostaje nazwę domyślną.
// Lata wpisane w osobnych liniach (np. „Semestr zimowy 2026/2027”) działają
// jak w imporcie zjazdów.

import { findDateMatches } from "./zjazdyParser";

export interface BulkEvent {
  /** Unikalny klucz w podglądzie. */
  key: string;
  start: string;
  end: string;
  /** „HH:MM” albo null – wydarzenie całodniowe. */
  startTime: string | null;
  endTime: string | null;
  /** Nazwa z linii; pusta – użyj domyślnej. */
  title: string;
  line: number;
}

/** Najdłuższe wydarzenie z zakresu dat (np. urlop, konferencja). */
export const MAX_EVENT_SPAN_DAYS = 31;

const TIME_RANGE = /(?:\bgodz\.?\s*|\bod\s+)?\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*(?:[-–—]|do)\s*([01]?\d|2[0-3]):([0-5]\d))?\b/i;
const pad = (h: string) => h.padStart(2, "0");

/** Nazwa po usunięciu dat, godzin i znaków oddzielających na brzegach. */
function cleanTitle(text: string): string {
  return text
    .replaceAll(/\s{2,}|\t/g, " ")
    .replaceAll(/^[\s,;:|–—\-•*·.()]+|[\s,;:|–—\-•*·.(]+$/g, "")
    .replaceAll(/\(\s*\)/g, "")
    .trim();
}

export function parseBulkEvents(text: string, now: Date = new Date()): BulkEvent[] {
  const matches = findDateMatches(text, now, MAX_EVENT_SPAN_DAYS);
  const events: BulkEvent[] = [];
  let offset = 0;

  text.split("\n").forEach((rawLine, lineNo) => {
    const lineStart = offset;
    const lineEnd = offset + rawLine.length;
    offset = lineEnd + 1;

    const inLine = matches.filter((m) => m.index >= lineStart && m.index < lineEnd);
    if (inLine.length === 0) return;

    // Wytnij daty (od końca, żeby pozycje się nie przesuwały).
    let rest = rawLine;
    for (const m of [...inLine].reverse()) {
      const from = m.index - lineStart;
      rest = `${rest.slice(0, from)} ${rest.slice(from + m.length)}`;
    }
    const time = TIME_RANGE.exec(rest);
    if (time) rest = rest.replace(time[0], " ");

    const startTime = time ? `${pad(time[1])}:${time[2]}` : null;
    const endTime = time?.[3] ? `${pad(time[3])}:${time[4]}` : null;
    const title = cleanTitle(rest);

    inLine.forEach((m, i) => {
      events.push({ key: `${lineNo}-${i}-${m.start}`, start: m.start, end: m.end, startTime, endTime, title, line: lineNo + 1 });
    });
  });
  return events;
}

/** Koniec wydarzenia z godziną: podany albo godzinę po rozpoczęciu (max 23:59). */
export function eventEndTime(startTime: string, endTime: string | null): string {
  if (endTime && endTime > startTime) return endTime;
  const [h, m] = startTime.split(":").map(Number);
  const next = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}
