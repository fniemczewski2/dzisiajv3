// lib/legalDeadlines.ts
//
// Obliczanie terminów ustawowych: art. 57 KPA (tak samo art. 123 KPK). Dni: bez dnia zdarzenia (§ 1); tygodnie:
// ten sam dzień tygodnia (§ 2); miesiące: ten sam dzień miesiąca, a gdy go brak – ostatni dzień miesiąca (§ 3);
// koniec w sobotę lub dzień ustawowo wolny przesuwa się na najbliższy dzień roboczy (§ 4). Daty jako „yyyy-MM-dd”,
// liczone w UTC – wynik nie zależy od strefy czasowej urządzenia.

import { getPolishHolidays } from "@/lib/holidays";
import type { TermUnit } from "@/types/letters";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(value: string): Date | null {
  const m = ISO_DAY.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCDate() === Number(m[3]) ? d : null;
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Sobota, niedziela lub święto z ustawy o dniach wolnych od pracy. */
export function isNonWorkingDay(day: string): boolean {
  const d = parseDay(day);
  if (!d) return false;
  const weekday = d.getUTCDay();
  if (weekday === 0 || weekday === 6) return true;
  return day in getPolishHolidays(d.getUTCFullYear());
}

/** Art. 57 § 4 KPA: najbliższy dzień, który nie jest sobotą ani dniem ustawowo wolnym. */
export function nextWorkingDay(day: string): string {
  let current = day;
  for (let i = 0; i < 14 && isNonWorkingDay(current); i++) {
    const d = parseDay(current) as Date;
    d.setUTCDate(d.getUTCDate() + 1);
    current = formatDay(d);
  }
  return current;
}

/** Koniec terminu bez przesunięcia z § 4 (art. 57 § 1–3 KPA). */
export function rawTermEnd(start: string, count: number, unit: TermUnit): string | null {
  const d = parseDay(start);
  if (!d || !Number.isInteger(count) || count < 0) return null;
  if (unit === "days") {
    d.setUTCDate(d.getUTCDate() + count);
    return formatDay(d);
  }
  if (unit === "weeks") {
    d.setUTCDate(d.getUTCDate() + count * 7);
    return formatDay(d);
  }
  const monthIndex = d.getUTCMonth() + count;
  const year = d.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(year, month));
  return formatDay(new Date(Date.UTC(year, month, day)));
}

/** Koniec terminu z przesunięciem na dzień roboczy (art. 57 § 1–4 KPA, art. 123 KPK). */
export function termEnd(start: string, count: number, unit: TermUnit): string | null {
  const raw = rawTermEnd(start, count, unit);
  return raw ? nextWorkingDay(raw) : null;
}

export function describeTerm(count: number, unit: TermUnit): string {
  if (unit === "days") return `${count} dni`;
  if (unit === "weeks") return `${count} tyg.`;
  return count === 1 ? "1 miesiąc" : `${count} miesiące`;
}
