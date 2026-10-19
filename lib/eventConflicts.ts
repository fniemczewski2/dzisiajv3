// lib/eventConflicts.ts
//
// Wykrywanie nakładających się terminów. Zasady:
// - kolizja to część wspólna dwóch wydarzeń z godziną (stykające się, np.
//   10:00–11:00 i 11:00–12:00, NIE kolidują),
// - wydarzenia całodniowe (konferencja, urlop, urodziny) nie zgłaszają kolizji
//   z każdym spotkaniem tego dnia – pokazujemy je osobno jako „tego dnia trwa też”,
//   bo inaczej ostrzeżenie pojawiałoby się zawsze i przestałoby cokolwiek znaczyć.

import { Event } from "@/types/events";
import { parseEventDate } from "./dateUtils";
import { expandRepeatingEvents } from "./eventUtils";

export interface EventConflict {
  event: Event;
  start: Date;
  end: Date;
}

export interface ConflictReport {
  /** Wydarzenia z godziną, które nachodzą na sprawdzany termin. */
  overlaps: EventConflict[];
  /** Wydarzenia całodniowe trwające w tym samym czasie (tylko informacja). */
  allDay: EventConflict[];
}

/** Całodniowe = od 00:00 do 23:59 (tak zapisuje je formularz wydarzenia). */
export function isAllDayEvent(event: Pick<Event, "start_time" | "end_time">): boolean {
  const s = parseEventDate(event.start_time);
  const e = parseEventDate(event.end_time);
  return s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 23 && e.getMinutes() >= 59;
}

/** Wirtualne wydarzenia (urodziny/imieniny) i instancje cykliczne mają id „<id>_<data>”. */
function baseEventId(id: string): string {
  return id.split("_")[0];
}

function isVirtual(id: string): boolean {
  return id.startsWith("bday_") || id.startsWith("nday_");
}

/** true, gdy przedziały [aStart, aEnd) i [bStart, bEnd) mają część wspólną. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Sprawdza, z czym koliduje termin [start, end].
 * `existing` to surowe wydarzenia z bazy – cykliczne rozwijamy tutaj.
 * `ignoreId` = wydarzenie, które właśnie edytujemy (nie koliduje samo ze sobą).
 */
export function findConflicts(
  start: Date,
  end: Date,
  existing: readonly Event[],
  options: { ignoreId?: string | null; candidateAllDay?: boolean } = {}
): ConflictReport {
  const report: ConflictReport = { overlaps: [], allDay: [] };
  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return report;
  if (end <= start) return report;

  const ignore = options.ignoreId ? baseEventId(options.ignoreId) : null;
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(end);
  dayEnd.setHours(23, 59, 59, 999);

  const instances = expandRepeatingEvents([...existing], dayStart, dayEnd);

  for (const event of instances) {
    if (isVirtual(event.id)) continue;
    if (ignore && baseEventId(event.id) === ignore) continue;

    const eStart = parseEventDate(event.start_time);
    const eEnd = parseEventDate(event.end_time);
    if (!rangesOverlap(start, end, eStart, eEnd)) continue;

    const entry = { event, start: eStart, end: eEnd };
    if (isAllDayEvent(event)) {
      report.allDay.push(entry);
    } else if (!options.candidateAllDay) {
      report.overlaps.push(entry);
    }
  }

  const byStart = (a: EventConflict, b: EventConflict) => a.start.getTime() - b.start.getTime();
  report.overlaps.sort(byStart);
  report.allDay.sort(byStart);
  return report;
}

/**
 * Identyfikatory wydarzeń z godziną, które w danym zbiorze nakładają się
 * na inne (np. do oznaczenia dnia w widoku miesiąca).
 */
export function overlappingEventIds(events: readonly Event[]): Set<string> {
  const timed = events
    .filter((e) => !isVirtual(e.id) && !isAllDayEvent(e))
    .map((e) => ({ id: e.id, start: parseEventDate(e.start_time), end: parseEventDate(e.end_time) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const result = new Set<string>();
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[j].start >= timed[i].end) break; // posortowane po starcie – dalej już nic nie nachodzi
      result.add(timed[i].id);
      result.add(timed[j].id);
    }
  }
  return result;
}

const timeFmt = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });

/** „10:00–11:30” albo „pon. 10:00 – wt. 09:00” dla wydarzeń przez kilka dni. */
export function formatConflictRange(c: EventConflict): string {
  const sameDay = c.start.toDateString() === c.end.toDateString();
  if (sameDay) return `${timeFmt.format(c.start)}–${timeFmt.format(c.end)}`;
  const dayFmt = new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "numeric" });
  return `${dayFmt.format(c.start)} ${timeFmt.format(c.start)} – ${dayFmt.format(c.end)} ${timeFmt.format(c.end)}`;
}
