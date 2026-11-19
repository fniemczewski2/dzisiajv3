// lib/dailyBrief.ts
//
// Briefing dnia – logika bez dostępu do bazy: kiedy pokazać kartę (od godziny z ustawień do zamknięcia przez
// użytkownika, tylko tego dnia) i które rachunki są dziś do zapłaty lub zaległe. Czas w strefie aplikacji.

import { billMonthStatus } from "@/lib/finance";
import type { RecurringBill, Transaction } from "@/types/finance";
import type { BriefEveningMode, Settings } from "@/types/settings";

const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DEFAULT_MORNING_TIME = "07:00";
const DEFAULT_EVENING_TIME = "21:00";

/** „HH:mm” w strefie Europe/Warsaw. */
export function appTimeHm(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

function normalizeHm(value: string | null | undefined, fallback: string): string {
  return value && HM_RE.test(value) ? value : fallback;
}

export interface BriefVisibility {
  morning: boolean;
  evening: boolean;
}

type BriefSettings = Pick<
  Settings,
  "brief_morning_time" | "brief_evening_time" | "brief_dismissed_morning" | "brief_dismissed_evening"
>;

/** Karta widoczna od ustawionej godziny do zamknięcia (zamknięcie dotyczy tylko bieżącego dnia). */
export function briefVisibility(settings: BriefSettings, today: string, nowHm: string): BriefVisibility {
  const morningAt = normalizeHm(settings.brief_morning_time, DEFAULT_MORNING_TIME);
  const eveningAt = normalizeHm(settings.brief_evening_time, DEFAULT_EVENING_TIME);
  return {
    morning: nowHm >= morningAt && settings.brief_dismissed_morning !== today,
    evening: nowHm >= eveningAt && settings.brief_dismissed_evening !== today,
  };
}

export function eveningParts(mode: BriefEveningMode | undefined): { summary: boolean; tomorrow: boolean } {
  const m = mode ?? "both";
  return { summary: m !== "tomorrow", tomorrow: m !== "summary" };
}

export interface BillsDue {
  dueToday: RecurringBill[];
  overdue: RecurringBill[];
}

/** Rachunki bieżącego miesiąca: termin dziś (niezapłacone) i po terminie bez płatności. */
export function billsDue(
  bills: readonly RecurringBill[],
  transactions: readonly Transaction[],
  today: string
): BillsDue {
  const monthKey = today.slice(0, 7);
  const dueToday: RecurringBill[] = [];
  const overdue: RecurringBill[] = [];
  for (const bill of bills) {
    if (!bill.active) continue;
    const { status, dueDates } = billMonthStatus(bill, monthKey, transactions, today);
    if (status === "overdue") overdue.push(bill);
    else if (status === "pending" && dueDates.includes(today)) dueToday.push(bill);
  }
  return { dueToday, overdue };
}
