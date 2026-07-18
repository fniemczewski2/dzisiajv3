// hooks/useBudget.ts
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { MonthData, YearData, RawBillRow } from "@/types/bills";

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const getEmptyMonthData = (): MonthData => ({
  sum: 0, rate: 0, budget: 0, income: 0,
  doneExpense: 0, plannedExpense: 0, monthlySpending: 0,
});

export function useBudgetData(year: number, monthRange?: [number, number]) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<YearData>({});
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadedMonths, setLoadedMonths] = useState<Set<number>>(new Set());

  const startMonth = monthRange?.[0] ?? 1;
  const endMonth = monthRange?.[1] ?? 12;

  const { toast } = useToast();
  const withRetry = useRetry();

  const fetchMonthData = useCallback(
    async (month: number): Promise<MonthData> => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }

      const monthStr = String(month).padStart(2, "0");
      const dateStart = `${year}-${monthStr}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonthStr = String(nextMonth).padStart(2, "0");
      const dateEnd = `${nextYear}-${nextMonthStr}-01`;

      const { data: bills, error: billsError } = await withRetry(async () =>
        supabase
          .from("bills")
          .select("amount,date,is_income,done")
          .eq("user_id", userId)
          .gte("date", dateStart)
          .lt("date", dateEnd)
      );
      if (billsError) throw billsError;

      const { data: habits, error: habitsError } = await withRetry(async () =>
        supabase
          .from("daily_habits")
          .select("date,daily_spending")
          .eq("user_id", userId)
          .gte("date", dateStart)
          .lt("date", dateEnd)
      );
      if (habitsError) throw habitsError;

      const monthData = getEmptyMonthData();

      (bills as RawBillRow[])?.forEach(({ amount, is_income, done: isDone }) => {
        if (is_income) {
          monthData.income += amount;
        } else {
          monthData.sum = (monthData.sum ?? 0) + amount;
          if (isDone) monthData.doneExpense += amount;
          else monthData.plannedExpense += amount;
        }
      });

      (habits as { daily_spending: number }[])?.forEach(({ daily_spending }) => {
        monthData.monthlySpending = (monthData.monthlySpending ?? 0) + daily_spending;
      });

      return monthData;
    },
    [userId, year, supabase, withRetry]
  );

  const fetchRates = useCallback(async (): Promise<Record<number, number>> => {
    if (!userId) {

      throw new Error("Unauthorized");
    }
    const { data: ratesData, error } = await withRetry(async () =>
      supabase.from("budgets").select("*").eq("user_id", userId).maybeSingle()
    );
    if (error) throw error;

    if (!ratesData) return {};
    const rates: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      rates[i] = ratesData[`${MONTH_KEYS[i - 1]}_rate`] || 0;
    }
    return rates;
  }, [userId, supabase, withRetry]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const rates = await fetchRates();
      const monthsToLoad = Array.from({ length: endMonth - startMonth + 1 }, (_, i) => startMonth + i);
      const monthResults = await Promise.all(
        monthsToLoad.map((month) => fetchMonthData(month).then((d) => ({ month, data: d })))
      );
      const newData: YearData = {};
      monthResults.forEach(({ month, data: monthData }) => {
        newData[month] = { ...monthData, rate: rates[month] || 0 };
      });
      setData((prev) => ({ ...prev, ...newData }));
      setLoadedMonths((prev) => {
        const s = new Set(prev);
        monthsToLoad.forEach((m) => s.add(m));
        return s;
      });
    } catch {
      toast.error("Błąd pobierania danych budżetu.");
    } finally {
      setFetching(false);
    }
  }, [userId, startMonth, endMonth, fetchRates, fetchMonthData, toast]);

  const updateRate = useCallback((month: number, rate: number) => {
    setData((prev) => ({
      ...prev,
      [month]: { ...(prev[month] || getEmptyMonthData()), rate },
    }));
  }, []);

  const saveRates = useCallback(async () => {
    if (!userId) {

      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const payload: Record<string, string | number> = { user_id: userId };
      Object.entries(data).forEach(([monthStr, monthData]) => {
        const m = Number.parseInt(monthStr);
        if (m >= 1 && m <= 12) payload[`${MONTH_KEYS[m - 1]}_rate`] = Number(monthData.rate) || 0;
      });

      const { data: existing, error: selectError } = await withRetry(async () =>
        supabase.from("budgets").select("id").eq("user_id", userId).maybeSingle()
      );
      if (selectError) throw selectError;

      const { error: dbError } = existing?.id
        ? await withRetry(async () => supabase.from("budgets").update(payload).eq("id", existing.id))
        : await withRetry(async () => supabase.from("budgets").insert([payload]));

      if (dbError) throw dbError;
      toast.success("Zapisano stawki budżetu");
    } catch {
      toast.error("Błąd zapisu stawek budżetu.");
    } finally {
      setLoading(false);
    }
  }, [userId, data, supabase, toast, withRetry]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, fetching, loading, loadedMonths, updateRate, saveRates, refetch: loadData };
}
