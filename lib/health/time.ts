// lib/health/time.ts
//
// Doba i godziny danych zdrowotnych w strefie aplikacji (Europe/Warsaw). Pomiary mają znaczniki UTC,
// a użytkownik ogląda „dzień” – granice doby uwzględniają zmianę czasu (23 i 25 godzin dwa razy w roku).

const HEALTH_TIME_ZONE = "Europe/Warsaw";

const DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: HEALTH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const TIME_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  timeZone: HEALTH_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const PARTS_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: HEALTH_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** „RRRR-MM-DD” w Warszawie dla chwili ISO. */
export function warsawDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

/** „GG:MM” w Warszawie dla chwili ISO. */
export function warsawTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

function offsetMinutes(instantMs: number): number {
  const parts: Record<string, number> = {};
  for (const part of PARTS_FORMAT.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((wall - Math.floor(instantMs / 1000) * 1000) / 60_000);
}

function isRealDate(y: number, m: number, d: number): boolean {
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

/** Chwila (ISO, UTC) odpowiadająca godzinie ściennej w Warszawie; null – niepoprawna data lub godzina. */
export function warsawInstant(date: string, time = "00:00"): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, day, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (h > 23 || mi > 59 || !isRealDate(y, mo, day)) return null;
  const guess = Date.UTC(y, mo - 1, day, h, mi);
  const firstPass = guess - offsetMinutes(guess) * 60_000;
  // Druga iteracja poprawia przesunięcie, gdy pierwsze przypuszczenie wypadło po drugiej stronie zmiany czasu.
  return new Date(guess - offsetMinutes(firstPass) * 60_000).toISOString();
}

export function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Granice doby: od północy (włącznie) do północy następnego dnia (wyłącznie). */
export function dayBounds(date: string): { from: string; to: string } | null {
  const from = warsawInstant(date);
  const to = warsawInstant(addDaysToDate(date, 1));
  return from && to ? { from, to } : null;
}
