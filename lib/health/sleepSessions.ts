// lib/health/sleepSessions.ts
//
// Sny (sesje) z surowych odcinków: jeden sen to odcinki oddzielone krótkimi przerwami. Dzięki temu noc i drzemka albo
// dwie noce wysłane jednym skryptem nie zlewają się w jedną „dobę”. Dzień snu to dzień przebudzenia (Europe/Warsaw).

import type { SleepSegment } from "@/lib/health/summary";
import { warsawDate } from "@/lib/health/time";

/** Przerwa dłuższa niż ta rozdziela sny; krótsze przebudzenia zostają w jednym śnie. */
const SLEEP_SESSION_GAP_MS = 3 * 3_600_000;

/**
 * Zapas czasu przy pobieraniu odcinków dla dnia: sen kończący się danego dnia mógł zacząć się dzień wcześniej, a o jego
 * podziale decyduje też przerwa po jego końcu.
 */
export const SLEEP_FETCH_MARGIN_MS = 18 * 3_600_000;

/** Odcinki pogrupowane w sny, w kolejności czasu. Odcinki z niepoprawnym czasem są pomijane. */
export function groupSleepSessions(segments: readonly SleepSegment[]): SleepSegment[][] {
  const timed = segments
    .map((segment) => ({ segment, from: Date.parse(segment.started_at), to: Date.parse(segment.ended_at) }))
    .filter((item) => Number.isFinite(item.from) && Number.isFinite(item.to) && item.to > item.from)
    .sort((a, b) => a.from - b.from);
  const sessions: { items: SleepSegment[]; end: number }[] = [];
  for (const { segment, from, to } of timed) {
    const last = sessions.at(-1);
    if (last && from - last.end <= SLEEP_SESSION_GAP_MS) {
      last.items.push(segment);
      last.end = Math.max(last.end, to);
    } else {
      sessions.push({ items: [segment], end: to });
    }
  }
  return sessions.map((session) => session.items);
}

/** Sny kończące się w podanym dniu (RRRR-MM-DD, czas Warszawy). */
export function sleepSessionsEndingOn(segments: readonly SleepSegment[], date: string): SleepSegment[][] {
  return groupSleepSessions(segments).filter((items) => {
    const end = Math.max(...items.map((s) => Date.parse(s.ended_at)));
    return warsawDate(new Date(end).toISOString()) === date;
  });
}
