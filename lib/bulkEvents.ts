// lib/bulkEvents.ts
//
// Masowe dodawanie wydarzeń z wklejonej listy. Każda linia to wydarzenie:
// data albo zakres dat (formaty jak w zjazdyParser), opcjonalnie godziny
// („10:00–12:00” albo „10:00”) i nazwa – czyli wszystko, co zostanie w linii
// po usunięciu daty i godzin. Linia bez nazwy dostaje nazwę domyślną.
// Lata wpisane w osobnych liniach (np. „Semestr zimowy 2026/2027”) działają
// jak w imporcie zjazdów.

import { MAX_EVENT_SPAN_DAYS } from "@/config/limits";
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

const pad = (h: string) => h.padStart(2, "0");

const CLOCK = /\b([01]?\d|2[0-3]):([0-5]\d)/g;
const CLOCK_AT_START = /^([01]?\d|2[0-3]):([0-5]\d)/;
const LEAD_IN = /(?:\bgodz\.?\s*|\bod\s+)$/i;
const RANGE_JOIN = /^\s*(?:[-–—]|do)\s*/i;
const WORD_CHAR = /\w/;

interface TimeRange {
  /** Dokładny fragment tekstu z godzinami (do wycięcia z tytułu). */
  text: string;
  start: string;
  end: string | null;
}

/** Granica słowa za pozycją `index` (koniec tekstu albo znak spoza \w). */
function boundaryAt(text: string, index: number): boolean {
  return index >= text.length || !WORD_CHAR.test(text[index]);
}

/**
 * Pierwsza godzina albo przedział godzin („10:00”, „godz. 9:30–11:00”,
 * „od 8:00 do 9:15”, „8:00do9:00”). Złożone z prostych wyrażeń zamiast
 * jednego długiego regexu – bez ryzyka wykładniczego nawracania.
 */
function findTimeRange(text: string): TimeRange | null {
  for (const first of text.matchAll(CLOCK)) {
    const firstEnd = first.index + first[0].length;
    let end = -1;
    let endTime: string | null = null;

    const join = RANGE_JOIN.exec(text.slice(firstEnd));
    const second = join ? CLOCK_AT_START.exec(text.slice(firstEnd + join[0].length)) : null;
    if (join && second && boundaryAt(text, firstEnd + join[0].length + second[0].length)) {
      end = firstEnd + join[0].length + second[0].length;
      endTime = `${pad(second[1])}:${second[2]}`;
    } else if (boundaryAt(text, firstEnd)) {
      end = firstEnd;
    }
    if (end === -1) continue;

    const leadIn = LEAD_IN.exec(text.slice(0, first.index));
    const begin = leadIn ? first.index - leadIn[0].length : first.index;
    return { text: text.slice(begin, end), start: `${pad(first[1])}:${first[2]}`, end: endTime };
  }
  return null;
}

const EDGE_CHARS = new Set([" ", "\t", ",", ";", ":", "|", "–", "—", "-", "•", "*", "·", ".", "(", ")"]);

/** Obcina znaki oddzielające z obu końców (bez regexu z kotwicami po obu stronach). */
function trimEdges(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && EDGE_CHARS.has(text[start])) start++;
  // Na końcu zostawiamy zamykający nawias – może należeć do tytułu.
  while (end > start && EDGE_CHARS.has(text[end - 1]) && text[end - 1] !== ")") end--;
  return text.slice(start, end);
}

/** Nazwa po usunięciu dat, godzin i znaków oddzielających na brzegach. */
function cleanTitle(text: string): string {
  return trimEdges(text.replaceAll("\t", " ").replaceAll(/ {2,}/g, " "))
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
    const time = findTimeRange(rest);
    if (time) rest = rest.replace(time.text, " ");

    const startTime = time?.start ?? null;
    const endTime = time?.end ?? null;
    const title = cleanTitle(rest);

    inLine.forEach((m, i) => {
      events.push({
        key: `${lineNo}-${i}-${m.start}`,
        start: m.start,
        end: m.end,
        startTime,
        endTime,
        title,
        line: lineNo + 1,
      });
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
