// supabase/functions/_shared/bills.ts
//
// Terminy rachunków stałych – wspólne dla aplikacji i edge functions
// (bez zależności zewnętrznych, jak recurrence.ts).

import { normalizeRule, occurrencesBetween, withMonthDay } from "./recurrence.ts";

export interface BillSchedule {
  start_date: string;
  recurrence: unknown;
  active: boolean;
}

/** Terminy w [from, to] (yyyy-MM-dd). Bez reguły – rachunek jednorazowy (start_date). */
export function billOccurrences(bill: BillSchedule, from: string, to: string): string[] {
  if (!bill.active) return [];
  const rule = normalizeRule(bill.recurrence);
  if (!rule) return bill.start_date >= from && bill.start_date <= to ? [bill.start_date] : [];
  const anchored = rule.monthDay ? rule : withMonthDay(rule, bill.start_date) ?? rule;
  return occurrencesBetween(bill.start_date, anchored, from, to);
}

export function isBillDueOn(bill: BillSchedule, day: string): boolean {
  return billOccurrences(bill, day, day).length > 0;
}

export const BILL_TASK_CATEGORY = "finanse";

export function billTaskTitle(name: string): string {
  return `Zapłać: ${name}`.slice(0, 200);
}
