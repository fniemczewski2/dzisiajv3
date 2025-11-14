// hooks/useBudget.tsx
import { useState, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

interface MonthData {
  sum: number;
  rate: number;
  budget: number;
  income: number;
  doneExpense: number;
  plannedExpense: number;
  monthlySpending: number;
}

type YearData = Record<number, MonthData>;

export function useBudgetData(year: number, monthRange?: [number, number]) {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<YearData>({});
  const [loadedMonths, setLoadedMonths] = useState<Set<number>>(new Set());

  const startMonth = monthRange?.[0] ?? 1;
  const endMonth = monthRange?.[1] ?? 12;

  const getEmptyMonthData = (): MonthData => ({
    sum: 0,
    rate: 0,
    budget: 0,
    income: 0,
    doneExpense: 0,
    plannedExpense: 0,
    monthlySpending: 0,
  });

  const fetchMonthData = useCallback(
    async (month: number): Promise<MonthData> => {
      if (!session?.user?.email) return getEmptyMonthData();

      const userEmail = session.user.email;
      const monthStr = String(month).padStart(2, "0");
      const dateStart = `${year}-${monthStr}-01`;
      const dateEnd = `${year}-${monthStr}-31`;

      try {
        // Fetch bills for this month only
        const { data: bills } = await supabase
          .from("bills")
          .select("amount,date,include_in_budget,description,done")
          .eq("user_name", userEmail)
          .gte("date", dateStart)
          .lte("date", dateEnd);

        // Fetch habits for this month only
        const { data: habits } = await supabase
          .from("daily_habits")
          .select("date,daily_spending")
          .eq("user_name", userEmail)
          .gte("date", dateStart)
          .lte("date", dateEnd);

        const monthData = getEmptyMonthData();

        bills?.forEach(
          ({ amount, include_in_budget, description, done: isDone }) => {
            if (include_in_budget) {
              if (description === "Bieżące") monthData.budget += amount;
              monthData.sum += amount;
              if (isDone) monthData.doneExpense += amount;
              else monthData.plannedExpense += amount;
            } else {
              monthData.income += amount;
            }
          }
        );

        habits?.forEach(({ daily_spending }) => {
          monthData.monthlySpending += daily_spending;
        });

        return monthData;
      } catch (error) {
        console.error(`Error fetching data for month ${month}:`, error);
        return getEmptyMonthData();
      }
    },
    [session, supabase, year]
  );

  const fetchRates = useCallback(async () => {
    if (!session?.user?.email) return {};

    const { data: ratesData } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_name", session.user.email)
      .maybeSingle();

    if (!ratesData) return {};

    const keys = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];

    const rates: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      rates[i] = ratesData[`${keys[i - 1]}_rate`] || 0;
    }

    return rates;
  }, [session, supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch rates once
      const rates = await fetchRates();

      // Fetch only requested months
      const monthsToLoad = Array.from(
        { length: endMonth - startMonth + 1 },
        (_, i) => startMonth + i
      );

      const monthDataPromises = monthsToLoad.map((month) =>
        fetchMonthData(month).then((data) => ({ month, data }))
      );

      const monthResults = await Promise.all(monthDataPromises);

      const newData: YearData = {};
      monthResults.forEach(({ month, data: monthData }) => {
        newData[month] = {
          sum: monthData.sum,
          rate: rates[month] || 0,
          budget: monthData.budget,
          income: monthData.income,
          doneExpense: monthData.doneExpense,
          plannedExpense: monthData.plannedExpense,
          monthlySpending: monthData.monthlySpending,
        };
      });

      setData((prev) => ({ ...prev, ...newData }));
      
      // ✅ FIX: Use Array.from instead of spreading Set
      setLoadedMonths((prev) => {
        const newSet = new Set(Array.from(prev));
        monthsToLoad.forEach(month => newSet.add(month));
        return newSet;
      });
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setLoading(false);
    }
  }, [startMonth, endMonth, fetchMonthData, fetchRates]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateRate = useCallback((month: number, rate: number) => {
    setData((prev) => {
      const existingData = prev[month] || getEmptyMonthData();
      return {
        ...prev,
        [month]: {
          ...existingData,
          rate,
        },
      };
    });
  }, []);

  const saveRates = useCallback(async () => {
    if (!session?.user?.email) return;

    const keys = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];

    const payload: any = { user_name: session.user.email };
    Object.entries(data).forEach(([monthStr, monthData]) => {
      const m = parseInt(monthStr);
      if (m >= 1 && m <= 12) {
        const key = keys[m - 1] + "_rate";
        payload[key] = monthData.rate;
      }
    });

    await supabase.from("budgets").upsert(payload, { onConflict: "user_name" });
  }, [session, supabase, data]);

  return {
    data,
    loading,
    loadedMonths,
    updateRate,
    saveRates,
    refetch: loadData,
  };
}