// lib/meetingPollGrid.ts

export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

export function generateTimeSlots(timeStart: string, timeEnd: string, durationMinutes: number): string[] {
  const [startH, startM] = normalizeTime(timeStart).split(":").map(Number);
  const [endH, endM] = normalizeTime(timeEnd).split(":").map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const slots: string[] = [];
  for (let t = startTotal; t < endTotal; t += durationMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = normalizeTime(time).split(":").map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function slotKey(date: string, startTime: string): string {
  return `${date}|${normalizeTime(startTime)}`;
}

export function buildAllowedSlotSet(
  dates: string[],
  timeStart: string,
  timeEnd: string,
  durationMinutes: number
): Set<string> {
  const times = generateTimeSlots(timeStart, timeEnd, durationMinutes);
  const set = new Set<string>();
  for (const d of dates) {
    for (const t of times) set.add(slotKey(d, t));
  }
  return set;
}

function toMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Koniec przedziału; w odróżnieniu od addMinutesToTime nie zawija północy („24:00” zamiast „00:00”). */
export function slotEndTime(time: string, durationMinutes: number): string {
  return fromMinutes(toMinutes(time) + durationMinutes);
}

export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/** „wt.” i „29.09” dla dnia w formacie RRRR-MM-DD (niezależnie od strefy urządzenia). */
export function formatPollDay(date: string): { weekday: string; day: string } {
  const [, month, day] = date.split("-");
  const weekday = new Intl.DateTimeFormat("pl-PL", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`)
  );
  return { weekday, day: `${day}.${month}` };
}

/** Kolejne dni robocze (pon.–pt.) po podanym dniu, bez niego samego. */
export function nextWorkingDays(after: string, count: number): string[] {
  const result: string[] = [];
  const cursor = new Date(`${after}T12:00:00Z`);
  while (result.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) result.push(cursor.toISOString().slice(0, 10));
  }
  return result;
}

export interface SlotRange {
  date: string;
  startIndex: number;
  endIndex: number;
  start: string;
  end: string;
  slots: number;
}

/** Ciągłe przedziały slotów spełniających warunek, osobno dla każdego dnia. */
export function contiguousRanges(
  dates: string[],
  times: string[],
  durationMinutes: number,
  isFree: (date: string, time: string) => boolean
): SlotRange[] {
  const ranges: SlotRange[] = [];
  for (const date of dates) {
    let start = -1;
    const close = (endIndex: number) => {
      ranges.push({
        date,
        startIndex: start,
        endIndex,
        start: times[start],
        end: slotEndTime(times[endIndex], durationMinutes),
        slots: endIndex - start + 1,
      });
      start = -1;
    };
    times.forEach((time, index) => {
      if (isFree(date, time)) {
        if (start === -1) start = index;
      } else if (start !== -1) {
        close(index - 1);
      }
    });
    if (start !== -1) close(times.length - 1);
  }
  return ranges;
}

/** Najdłuższe przedziały, w których dostępna jest największa liczba osób. */
export function bestRanges(
  dates: string[],
  times: string[],
  durationMinutes: number,
  counts: Record<string, number>,
  limit = 3
): { count: number; ranges: SlotRange[] } {
  let max = 0;
  for (const date of dates) {
    for (const time of times) max = Math.max(max, counts[slotKey(date, time)] ?? 0);
  }
  if (max === 0) return { count: 0, ranges: [] };

  const ranges = contiguousRanges(dates, times, durationMinutes, (date, time) => (counts[slotKey(date, time)] ?? 0) === max)
    .sort((a, b) => b.slots - a.slots || a.date.localeCompare(b.date) || a.startIndex - b.startIndex)
    .slice(0, limit);
  return { count: max, ranges };
}

/** Polska odmiana rzeczownika po liczebniku: 1 slot, 2–4 sloty, 5+ slotów. */
export function pluralPl(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  const lastTwo = Math.abs(count) % 100;
  const last = Math.abs(count) % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}
