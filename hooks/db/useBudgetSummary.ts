// hooks/db/useBudgetSummary.ts

import { useQueryState } from "@/hooks/useQueryState";
import { NotSignedInError } from "@/lib/errors";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import type { BudgetCategory, RawBillRow, SummaryItem } from "@/types/bills";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { calculateExpectedYearlyLimit } from "@/lib/budgetUtils";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import { billOccurrences } from "@/lib/finance";
import { getAppDate } from "@/lib/dateUtils";
import type { RecurringBill } from "@/types/finance";

interface SpendBucket {
  ySpent: number;
  yPlan: number;
  mSpent: number;
  mPlan: number;
}

const EMPTY_BUCKET: SpendBucket = { ySpent: 0, yPlan: 0, mSpent: 0, mPlan: 0 };

function buildSpendMap(expenses: RawBillRow[], monthStart: string, monthEnd: string): Record<string, SpendBucket> {
  const spendMap: Record<string, SpendBucket> = {};
  for (const bill of expenses) {
    const key = bill.category_id ?? "__none__";
    spendMap[key] ??= { ySpent: 0, mSpent: 0, yPlan: 0, mPlan: 0 };
    const inMonth = bill.date >= monthStart && bill.date <= monthEnd;

    if (bill.done) {
      spendMap[key].ySpent += bill.amount;
      if (inMonth) spendMap[key].mSpent += bill.amount;
    } else {
      spendMap[key].yPlan += bill.amount;
      if (inMonth) spendMap[key].mPlan += bill.amount;
    }
  }
  return spendMap;
}

function buildSummaryItems(
  categories: BudgetCategory[],
  spendMap: Record<string, SpendBucket>,
  monthIndex: number,
  year: number
): SummaryItem[] {
  return categories.map((cat) => {
    const spent = spendMap[cat.id]?.ySpent ?? 0;
    const planned = spendMap[cat.id]?.yPlan ?? 0;
    const mSpent = spendMap[cat.id]?.mSpent ?? 0;
    const mPlanned = spendMap[cat.id]?.mPlan ?? 0;

    const limit = calculateExpectedYearlyLimit(cat, monthIndex, year);
    const mLimit = cat.is_monthly ? cat.monthly_amounts?.[monthIndex] || 0 : (cat.monthly_amounts?.[0] || 0) / 12;

    return {
      category: cat,
      spent,
      planned,
      limit,
      remaining: limit - spent - planned,
      thisMonthSpent: mSpent,
      thisMonthPlanned: mPlanned,
      thisMonthLimit: mLimit,
      thisMonthRemaining: mLimit - mSpent - mPlanned,
    };
  });
}

/**
 * Zaplanowane wydatki: terminy rachunków stałych od dziś do końca roku,
 * z pominięciem miesięcy, w których rachunek ma już powiązaną płatność.
 */
export function plannedBillRows(
  bills: readonly RecurringBill[],
  txs: ReadonlyArray<{ date: string; recurring_bill_id: string | null }>,
  yearStart: string,
  yearEnd: string,
  today: string = getAppDate()
): RawBillRow[] {
  const paidMonths = new Set(
    txs.filter((t) => t.recurring_bill_id).map((t) => `${t.recurring_bill_id}|${t.date.slice(0, 7)}`)
  );
  const from = today > yearStart ? today : yearStart;
  const rows: RawBillRow[] = [];
  for (const bill of bills) {
    for (const date of billOccurrences(bill, from, yearEnd)) {
      if (paidMonths.has(`${bill.id}|${date.slice(0, 7)}`)) continue;
      rows.push({ amount: Number(bill.amount), date, category_id: bill.category_id, is_income: false, done: false });
    }
  }
  return rows;
}

type YearTx = RawBillRow & { recurring_bill_id: string | null };

const NO_TX: YearTx[] = [];

export function useBudgetSummary(
  year: number,
  monthIndex: number,
  categories: BudgetCategory[],
  recurringBills: readonly RecurringBill[] = []
) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const withRetry = useRetry();

  // Transakcje roku z bazy (TanStack Query); podsumowanie liczone w pamięci z kategorii,
  // rachunków stałych i miesiąca – zmiana miesiąca nie wymaga nowego zapytania.
  const queryYear = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<YearTx[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("transactions")
              .select("amount, date, category_id, is_income, recurring_bill_id")
              .eq("user_id", userId)
              .gte("date", `${year}-01-01`)
              .lte("date", `${year}-12-31`)
              .abortSignal(signal),
          signal
        );
        if (error) throw error;
        return ((data ?? []) as YearTx[]).map((t) => ({ ...t, amount: Number(t.amount) }));
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania statystyk budżetu.", { cause: err });
        throw err;
      }
    },
    [supabase, userId, year, toast, withRetry]
  );
  const {
    data: txs,
    fetching: loading,
    refetch: refresh,
  } = useQueryState<YearTx[]>({
    queryKey: ["budget-year", userId ?? null, year],
    queryFn: queryYear,
    initial: NO_TX,
    enabled: Boolean(userId) && categories.length > 0,
  });

  const { summary, uncategorised, totalIncome } = useMemo(() => {
    if (categories.length === 0) return { summary: [], uncategorised: EMPTY_BUCKET, totalIncome: 0 };
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const targetDateForMonth = new Date(year, monthIndex, 1);
    const monthStart = format(startOfMonth(targetDateForMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(targetDateForMonth), "yyyy-MM-dd");

    const income = txs.filter((b) => b.is_income).reduce((sum, b) => sum + b.amount, 0);
    // Od 1.40: wydane = transakcje; zaplanowane = przyszłe terminy rachunków stałych
    // (bez tych, które w danym miesiącu już mają powiązaną płatność).
    const spent: RawBillRow[] = txs.filter((t) => !t.is_income).map((t) => ({ ...t, done: true }));
    const planned = plannedBillRows(recurringBills, txs, yearStart, yearEnd);
    const spendMap = buildSpendMap([...spent, ...planned], monthStart, monthEnd);
    return {
      summary: buildSummaryItems(categories, spendMap, monthIndex, year),
      uncategorised: spendMap["__none__"] ?? EMPTY_BUCKET,
      totalIncome: income,
    };
  }, [txs, categories, recurringBills, monthIndex, year]);

  return { summary, uncategorised, totalIncome, loading, refresh };
}
