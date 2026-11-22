// lib/calendarFeed.ts
//
// Kanał kalendarza (.ics, subskrypcja WebCal): wydarzenia (z wystąpieniami cyklicznymi), zadania z terminem
// i rutyny planu dnia. Czasy w bazie to czas ścienny w Polsce (`…+00`, zob. lib/dateUtils.ts), więc w pliku
// mają strefę TZID=Europe/Warsaw z dołączonym VTIMEZONE (RFC 5545 § 3.6.5). Bez ical.js – sam tekst, żeby
// wygenerować setki wpisów jednym przebiegiem; ucieczka znaków i zawijanie linii według RFC 5545 § 3.1, § 3.3.11.

import { addDays, format } from "date-fns";
import { parseEventDate } from "@/lib/dateUtils";
import { expandRepeatingEvents } from "@/lib/eventUtils";
import { resolveActiveSchema } from "@/lib/daySchemas";
import type { Event, EventOverride } from "@/types/events";
import type { Task } from "@/types/tasks";
import type { DailyOverride, Schema } from "@/types/schemas";

const FEED_TZID = "Europe/Warsaw";
/** Zakres kanału względem dnia generowania. */
export const FEED_PAST_DAYS = 30;
export const FEED_FUTURE_DAYS = 90;
/** Czas trwania wpisu rutyny (schemat dnia ma tylko godzinę rozpoczęcia). */
const ROUTINE_MINUTES = 15;

/** Strefa Europe/Warsaw: CET/CEST, zmiana w ostatnią niedzielę marca i października (od 1996 r.). */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Warsaw",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** RFC 5545 § 3.3.11: \\ ; , i nowa linia. */
export function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", String.raw`\;`)
    .replaceAll(",", String.raw`\,`)
    .replaceAll(/\r?\n/g, String.raw`\n`);
}

/** RFC 5545 § 3.1: linie do 75 oktetów, kontynuacja od spacji; nie dzielimy znaku UTF-8. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const len = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (size + len > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += len;
  }
  out.push(current);
  return out.join("\r\n ");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Czas ścienny → „yyyyMMddTHHmmss” (bez strefy; strefę niesie parametr TZID). */
function localStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function utcStamp(d: Date): string {
  return d
    .toISOString()
    .replaceAll(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

const dateStamp = (day: string) => day.replaceAll("-", "");

interface FeedEntry {
  uid: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  /** Wydarzenie z godziną: czas ścienny; całodniowe: tylko `day`. */
  start?: Date;
  end?: Date;
  day?: string;
  categories?: string;
}

function entryLines(e: FeedEntry, dtstamp: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${dtstamp}`];
  if (e.start && e.end) {
    lines.push(`DTSTART;TZID=${FEED_TZID}:${localStamp(e.start)}`, `DTEND;TZID=${FEED_TZID}:${localStamp(e.end)}`);
  } else if (e.day) {
    const next = format(addDays(new Date(`${e.day}T12:00:00`), 1), "yyyy-MM-dd");
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(e.day)}`, `DTEND;VALUE=DATE:${dateStamp(next)}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(e.summary || "(bez tytułu)")}`);
  if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
  if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
  if (e.categories) lines.push(`CATEGORIES:${escapeIcsText(e.categories)}`);
  lines.push("TRANSP:OPAQUE", "END:VEVENT");
  return lines;
}

export interface FeedInput {
  events: readonly Event[];
  tasks: readonly Task[];
  schemas: readonly Schema[];
  /** Wybrany schemat na dzień (day_schema_choices): data → schema_id lub null (bez schematu). */
  schemaChoices: ReadonlyMap<string, string | null>;
  /** Wyjątki rutyn (daily_overrides) według daty. */
  overrides: ReadonlyMap<string, readonly DailyOverride[]>;
  /** Wyjątki terminów serii (event_overrides) z zakresu kanału. */
  eventOverrides?: readonly EventOverride[];
  /** Pierwszy i ostatni dzień kanału (yyyy-MM-dd). */
  from: string;
  to: string;
  now: Date;
  /** Domena w UID – stała, żeby kalendarz rozpoznawał te same wpisy przy kolejnym pobraniu. */
  uidDomain: string;
}

function eventEntries(input: FeedInput): FeedEntry[] {
  const start = new Date(`${input.from}T00:00:00`);
  const end = new Date(`${input.to}T23:59:59`);
  return expandRepeatingEvents([...input.events], start, end, input.eventOverrides ?? []).map((ev) => ({
    uid: `event-${ev.id}@${input.uidDomain}`,
    summary: ev.title,
    description: ev.description,
    location: ev.place,
    start: parseEventDate(ev.start_time),
    end: parseEventDate(ev.end_time),
    categories: ev.category ?? undefined,
  }));
}

function taskEntries(input: FeedInput): FeedEntry[] {
  return input.tasks
    .filter((t) => t.due_date && t.due_date >= input.from && t.due_date <= input.to && t.status !== "done")
    .map((t) => {
      const base = {
        uid: `task-${t.id}@${input.uidDomain}`,
        summary: `Zadanie: ${t.title}`,
        description: t.description,
        categories: t.category,
      };
      if (!t.scheduled_time) return { ...base, day: t.due_date };
      const start = parseEventDate(t.scheduled_time);
      return { ...base, start, end: new Date(start.getTime() + 30 * 60_000) };
    });
}

function routineEntries(input: FeedInput): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (let d = new Date(`${input.from}T12:00:00`); format(d, "yyyy-MM-dd") <= input.to; d = addDays(d, 1)) {
    const day = format(d, "yyyy-MM-dd");
    const weekday = (d.getDay() + 6) % 7;
    const schema = resolveActiveSchema(input.schemas, weekday, input.schemaChoices.get(day));
    if (!schema) continue;
    const overrides = input.overrides.get(day) ?? [];
    schema.entries.forEach((entry, idx) => {
      const override = overrides.find((o) => o.schema_id === `schema-${idx}`);
      if (override?.is_hidden) return;
      const time = override?.new_time || entry.time;
      if (!/^\d{2}:\d{2}/.test(time)) return;
      const start = new Date(`${day}T${time.slice(0, 5)}:00`);
      out.push({
        uid: `routine-${schema.id ?? schema.name}-${idx}-${day}@${input.uidDomain}`,
        summary: entry.label,
        categories: "Plan dnia",
        start,
        end: new Date(start.getTime() + ROUTINE_MINUTES * 60_000),
      });
    });
  }
  return out;
}

/** Cały plik .ics (CRLF, zawinięte linie). */
export function buildCalendarFeed(input: FeedInput): string {
  const dtstamp = utcStamp(input.now);
  const entries = [...eventEntries(input), ...taskEntries(input), ...routineEntries(input)];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dzisiaj.Fun//Kanal kalendarza//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Dzisiaj.Fun",
    `X-WR-TIMEZONE:${FEED_TZID}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...VTIMEZONE,
    ...entries.flatMap((e) => entryLines(e, dtstamp)),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

/** Zakres kanału od dnia `today`. */
export function feedRange(today: string): { from: string; to: string } {
  const base = new Date(`${today}T12:00:00`);
  return {
    from: format(addDays(base, -FEED_PAST_DAYS), "yyyy-MM-dd"),
    to: format(addDays(base, FEED_FUTURE_DAYS), "yyyy-MM-dd"),
  };
}
