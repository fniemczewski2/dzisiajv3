// lib/finance.ts
//
// Logika finansów bez dostępu do bazy (łatwa do testowania):
// - terminy rachunków stałych (ten sam silnik reguł co zadania i wydarzenia),
// - prognoza rachunków na kolejny miesiąc,
// - status rachunku w miesiącu (zapłacony / oczekuje / zaległy),
// - D1: automatyczne łączenie transakcji z rachunkami (sugestie do weryfikacji),
// - D2: kategoria z historii podobnych transakcji,
// - wydatki dnia z transakcji w wybranych kategoriach,
// - podsumowanie miesiąca.

import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { billOccurrences as sharedBillOccurrences } from "@/supabase/functions/_shared/bills";
import type { BudgetCategory } from "@/types/bills";
import type { RecurringBill, Transaction } from "@/types/finance";

const day = (d: Date) => format(d, "yyyy-MM-dd");

// --- Terminy ----------------------------------------------------------------------

/** Terminy rachunku w [from, to] (yyyy-MM-dd). Jednorazowy – tylko start_date. */
export function billOccurrences(bill: Pick<RecurringBill, "start_date" | "recurrence" | "active">, from: string, to: string): string[] {
  return sharedBillOccurrences(bill, from, to);
}

/** Najbliższy termin od `fromDay` włącznie (szukamy rok naprzód). */
export function nextBillDue(bill: RecurringBill, fromDay: string): string | null {
  const to = day(addMonths(parseISO(fromDay), 13));
  return billOccurrences(bill, fromDay, to)[0] ?? null;
}

export function monthRange(monthKey: string): { from: string; to: string } {
  const start = parseISO(`${monthKey}-01`);
  return { from: day(startOfMonth(start)), to: day(endOfMonth(start)) };
}

export function nextMonthKey(monthKey: string): string {
  return format(addMonths(parseISO(`${monthKey}-01`), 1), "yyyy-MM");
}

export interface ForecastItem {
  bill: RecurringBill;
  dates: string[];
  total: number;
}

/** Prognoza rachunków stałych w miesiącu `monthKey` (yyyy-MM). */
export function forecastMonth(bills: readonly RecurringBill[], monthKey: string): { items: ForecastItem[]; total: number } {
  const { from, to } = monthRange(monthKey);
  const items = bills
    .map((bill) => {
      const dates = billOccurrences(bill, from, to);
      return { bill, dates, total: dates.length * Number(bill.amount) };
    })
    .filter((i) => i.dates.length > 0)
    .sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
  return { items, total: round2(items.reduce((s, i) => s + i.total, 0)) };
}

export type BillStatus = "paid" | "pending" | "overdue" | "none";

/**
 * Status rachunku w miesiącu: zapłacony, gdy jest powiązana transakcja
 * (także sugerowana) z tego miesiąca; zaległy, gdy termin minął bez płatności.
 */
export function billMonthStatus(
  bill: RecurringBill,
  monthKey: string,
  transactions: readonly Transaction[],
  today: string
): { status: BillStatus; dueDates: string[]; paid: number } {
  const { from, to } = monthRange(monthKey);
  const dueDates = billOccurrences(bill, from, to);
  const linked = transactions.filter((t) => t.recurring_bill_id === bill.id && t.date >= from && t.date <= to);
  const paid = round2(linked.reduce((s, t) => s + Number(t.amount), 0));
  if (dueDates.length === 0) return { status: linked.length ? "paid" : "none", dueDates, paid };
  if (linked.length > 0) return { status: "paid", dueDates, paid };
  return { status: dueDates[0] < today ? "overdue" : "pending", dueDates, paid };
}

// --- D1: łączenie transakcji z rachunkami -------------------------------------------

const STOP_WORDS = new Set(["PLATNOSC", "PŁATNOŚĆ", "KARTA", "KARTĄ", "BLIK", "PRZELEW", "ZAKUP", "TRANSAKCJA", "WWW", "COM", "PL", "SP", "Z", "O", "OO"]);

/**
 * Klucz sprzedawcy: pierwsze znaczące słowo opisu, bez polskich znaków.
 * „Apple” i „APPLE.COM/BILL” → „APPLE”; „Płatność kartą ORLEN 123” → „ORLEN”.
 */
export function merchantKey(description: string | null | undefined): string {
  const words = (description ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll("Ł", "L")
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));
  return words[0] ?? "";
}

/** Kwoty „prawie równe”: różnica do 10% (min. 2 zł) – ceny subskrypcji się zmieniają. */
export function amountsClose(a: number, b: number): boolean {
  const diff = Math.abs(Number(a) - Number(b));
  return diff <= Math.max(2, Math.max(Number(a), Number(b)) * 0.1);
}

export interface LinkSuggestion {
  billId: string;
  reason: "learned" | "name";
}

/**
 * Sugestia rachunku stałego dla transakcji (wydatku):
 * 1) „learned” – wcześniej ręcznie połączona transakcja tego samego sprzedawcy
 *    o podobnej kwocie (np. styczeń: Apple 19,90 → Apple Music 19,99);
 * 2) „name” – nazwa rachunku zaczyna się od sprzedawcy, kwota podobna,
 *    a data transakcji wypada do 7 dni od terminu.
 */
export function suggestBillLink(
  tx: Pick<Transaction, "description" | "amount" | "date" | "is_income">,
  bills: readonly RecurringBill[],
  history: readonly Transaction[]
): LinkSuggestion | null {
  if (tx.is_income) return null;
  const key = merchantKey(tx.description);
  if (!key) return null;
  const activeIds = new Set(bills.filter((b) => b.active).map((b) => b.id));

  const learned = history
    .filter((h) => h.link_status === "manual" && h.recurring_bill_id && activeIds.has(h.recurring_bill_id))
    .filter((h) => merchantKey(h.description) === key && amountsClose(h.amount, tx.amount))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (learned?.recurring_bill_id) return { billId: learned.recurring_bill_id, reason: "learned" };

  const near = { from: day(addDays(parseISO(tx.date), -7)), to: day(addDays(parseISO(tx.date), 7)) };
  const byName = bills.find(
    (b) =>
      b.active &&
      merchantKey(b.name) === key &&
      amountsClose(b.amount, tx.amount) &&
      billOccurrences(b, near.from, near.to).length > 0
  );
  return byName ? { billId: byName.id, reason: "name" } : null;
}

// --- D2: kategoria z historii ----------------------------------------------------------

/**
 * Nazwa kategorii z ostatniej transakcji tego samego sprzedawcy, która miała
 * kategorię. Zwracamy nazwę, bo kategorie budżetu są zakładane na każdy rok osobno.
 */
export function suggestCategoryName(
  tx: Pick<Transaction, "description" | "is_income">,
  history: readonly Transaction[],
  categoryNameById: ReadonlyMap<string, string>
): string | null {
  const key = merchantKey(tx.description);
  if (!key) return null;
  const match = history
    .filter((h) => h.category_id && h.is_income === tx.is_income && merchantKey(h.description) === key)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return match?.category_id ? categoryNameById.get(match.category_id) ?? null : null;
}

// --- Wydatki dnia i podsumowania ----------------------------------------------------------

const norm = (s: string) => s.trim().toLocaleLowerCase("pl");

/** Wydatki dnia: suma wydatków z danego dnia w kategoriach wskazanych w ustawieniach. */
export function dailySpending(
  transactions: readonly Transaction[],
  date: string,
  categoryNames: readonly string[],
  categories: readonly BudgetCategory[]
): number {
  const wanted = new Set(categoryNames.map(norm));
  const ids = new Set(categories.filter((c) => wanted.has(norm(c.name))).map((c) => c.id));
  return round2(
    transactions
      .filter((t) => !t.is_income && t.date === date && t.category_id && ids.has(t.category_id))
      .reduce((s, t) => s + Number(t.amount), 0)
  );
}

export interface MonthCategoryRow {
  categoryId: string | null;
  name: string;
  expenses: number;
  count: number;
}

export interface MonthSummary {
  income: number;
  expenses: number;
  balance: number;
  byCategory: MonthCategoryRow[];
  /** Wydatki powiązane z rachunkami stałymi. */
  billsPaid: number;
}

export function summarizeMonth(transactions: readonly Transaction[], categories: readonly BudgetCategory[]): MonthSummary {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const rows = new Map<string, MonthCategoryRow>();
  let income = 0;
  let expenses = 0;
  let billsPaid = 0;
  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.is_income) {
      income += amount;
      continue;
    }
    expenses += amount;
    if (t.recurring_bill_id) billsPaid += amount;
    const key = t.category_id ?? "__none__";
    const row = rows.get(key) ?? {
      categoryId: t.category_id,
      name: t.category_id ? names.get(t.category_id) ?? "Inna kategoria" : "Bez kategorii",
      expenses: 0,
      count: 0,
    };
    row.expenses += amount;
    row.count += 1;
    rows.set(key, row);
  }
  const byCategory = [...rows.values()]
    .map((r) => ({ ...r, expenses: round2(r.expenses) }))
    .sort((a, b) => b.expenses - a.expenses);
  return { income: round2(income), expenses: round2(expenses), balance: round2(income - expenses), byCategory, billsPaid: round2(billsPaid) };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatPln(value: number): string {
  return value.toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 2 });
}

/** Klucz deduplikacji transakcji z CSV. */
export function importKey(t: { date: string; amount: number; is_income: boolean; description: string }, occurrence = 0): string {
  return [t.date, t.is_income ? "+" : "-", Number(t.amount).toFixed(2), t.description.trim().toUpperCase().slice(0, 60), occurrence].join("|");
}
