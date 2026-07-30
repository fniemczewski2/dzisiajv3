// lib/server/calendarTime.ts

import type { GoogleEventDateTime } from "@/types/googleCalendar";

const WARSAW_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function instantToWarsawNaive(instant: Date): string {
  const parts = WARSAW_FORMATTER.formatToParts(instant);
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}`;
}

function allDayToNaive(date: string, isEndTime: boolean): string {
  if (!isEndTime) return `${date}T00:00:00`;

  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}T23:59:59`;
}

export function toSupabaseTime(
  dt: GoogleEventDateTime | undefined,
  isEndTime = false
): string {
  if (dt?.dateTime) {
    const parsed = new Date(dt.dateTime);
    if (!Number.isNaN(parsed.getTime())) return instantToWarsawNaive(parsed);
  }
  if (dt?.date) return allDayToNaive(dt.date, isEndTime);
  return instantToWarsawNaive(new Date());
}

export function outlookToSupabaseTime(dateTime: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateTime);
  const parsed = new Date(hasZone ? dateTime : `${dateTime}Z`);
  if (Number.isNaN(parsed.getTime())) return instantToWarsawNaive(new Date());
  return instantToWarsawNaive(parsed);
}

export function warsawNaiveToRFC3339(naiveLocal: string): string {
  try {
    const localStr = naiveLocal.replace(" ", "T").replace(/([+-]\d{2}:\d{2}|[+-]\d{2}|Z)$/, "");
    const refDate = new Date(`${localStr}Z`);
    const offsetStr =
      new Intl.DateTimeFormat("en", { timeZone: "Europe/Warsaw", timeZoneName: "shortOffset" })
        .formatToParts(refDate)
        .find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
    const match = /GMT([+-])(\d+)/.exec(offsetStr);
    const sign = match?.[1] ?? "+";
    const hrs = String(Number.parseInt(match?.[2] ?? "1", 10)).padStart(2, "0");
    return `${localStr}${sign}${hrs}:00`;
  } catch {
    return new Date().toISOString();
  }
}
