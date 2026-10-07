// lib/trainPlan.ts

export interface TrainTimeInput {
  date: string;          // "YYYY-MM-DD"
  departureTime: string; // "HH:MM" (albo "HH:MM:SS")
}

export function plannedDeparture(t: TrainTimeInput): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.date);
  const h = /^(\d{1,2}):(\d{2})/.exec(t.departureTime ?? "");
  if (!d || !h) return null;
  const date = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(h[1]), Number(h[2]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function planHourKey(t: TrainTimeInput): string | null {
  const m = /^(\d{1,2}):/.exec(t.departureTime ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? `${String(h).padStart(2, "0")}:00` : null;
}

export function expectedDeparture(t: TrainTimeInput, delayMinutes: number): Date | null {
  const planned = plannedDeparture(t);
  if (!planned) return null;
  return new Date(planned.getTime() + Math.max(0, delayMinutes) * 60_000);
}

export function isStatusRelevant(t: TrainTimeInput, now: Date = new Date()): boolean {
  const planned = plannedDeparture(t);
  if (!planned) return false;
  const diff = planned.getTime() - now.getTime();
  return diff <= 3 * 3_600_000 && diff >= -12 * 3_600_000;
}

export function relativeDeparture(expected: Date, now: Date = new Date()): string {
  const minutes = Math.round((expected.getTime() - now.getTime()) / 60_000);
  if (minutes < 0) return "odjechał";
  if (minutes === 0) return "teraz";
  if (minutes < 60) return `za ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `za ${h} h ${m} min` : `za ${h} h`;
}
export function cleanValue(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return !t || t === "-" || t === "..." ? null : t;
}

const WARSAW_TZ = "Europe/Warsaw";
const WARSAW_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: WARSAW_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function warsawOffsetMs(instant: number): number {
  const parts = WARSAW_PARTS.formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wallAsUtc - Math.floor(instant / 1000) * 1000;
}

const HAS_OFFSET = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

export function parsePlkTime(value: string | null | undefined): Date | null {
  const v = (value ?? "").trim();
  if (!v) return null;

  if (/[T ]\d{2}:\d{2}/.test(v) && HAS_OFFSET.test(v)) {
    const d = new Date(v.replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = LOCAL_DATE_TIME.exec(v);
  if (!m) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  const firstGuess = wall - warsawOffsetMs(wall);
  return new Date(wall - warsawOffsetMs(firstGuess));
}

export type TrainStopPhase = "departure" | "arrival";

export interface TrainLiveDetails {
  departurePlatform?: string;
  departureDelay?: number;
  actualDeparture?: string;
  departed?: boolean;
  arrivalPlatform?: string;
  arrivalDelay?: number;
  plannedArrival?: string;
  actualArrival?: string;
  arrivalStation?: string;
}

export interface TrainStop {
  phase: TrainStopPhase;
  station: string;
  planned: Date | null;
  expected: Date | null;
  delay: number;
  platform: string | null;
}

export function plannedArrival(t: TrainTimeInput, arrivalTime: string | undefined): Date | null {
  const departure = plannedDeparture(t);
  if (!departure || !arrivalTime) return null;
  const arrival = plannedDeparture({ date: t.date, departureTime: arrivalTime });
  if (!arrival) return null;
  if (arrival.getTime() < departure.getTime()) arrival.setDate(arrival.getDate() + 1);
  return arrival;
}

export function actualDepartureTime(t: TrainTimeInput, live: TrainLiveDetails): Date | null {
  return parsePlkTime(live.actualDeparture) ?? expectedDeparture(t, live.departureDelay ?? 0);
}

export function arrivalTimes(
  t: TrainTimeInput,
  live: TrainLiveDetails
): { planned: Date | null; expected: Date | null } {
  const delay = Math.max(0, live.arrivalDelay ?? 0);
  const actual = parsePlkTime(live.actualArrival);
  const scheduled = plannedArrival(t, live.plannedArrival);
  const planned = scheduled ?? (actual ? new Date(actual.getTime() - delay * 60_000) : null);
  const expected = actual ?? (planned ? new Date(planned.getTime() + delay * 60_000) : null);
  return { planned, expected };
}

export function currentTrainStop(
  t: TrainTimeInput & { from?: string; to?: string },
  live: TrainLiveDetails,
  now: Date = new Date()
): TrainStop {
  const departedAt = actualDepartureTime(t, live);
  const hasLiveData = Object.keys(live).length > 0;
  const departedByTime = departedAt !== null && now.getTime() >= departedAt.getTime();
  const departed = hasLiveData && (live.departed === true || departedByTime);

  if (departed) {
    const { planned, expected } = arrivalTimes(t, live);
    return {
      phase: "arrival",
      station: live.arrivalStation || t.to || "",
      planned,
      expected,
      delay: Math.max(0, live.arrivalDelay ?? 0),
      platform: cleanValue(live.arrivalPlatform),
    };
  }

  const delay = Math.max(0, live.departureDelay ?? 0);
  return {
    phase: "departure",
    station: t.from ?? "",
    planned: plannedDeparture(t),
    expected: departedAt ?? expectedDeparture(t, delay),
    delay,
    platform: cleanValue(live.departurePlatform),
  };
}

export function relativeStopTime(stop: Pick<TrainStop, "phase" | "expected">, now: Date = new Date()): string | null {
  if (!stop.expected) return null;
  if (stop.phase === "departure") return relativeDeparture(stop.expected, now);
  const text = relativeDeparture(stop.expected, now);
  return text === "odjechał" ? "na miejscu" : `przyjazd ${text}`;
}
