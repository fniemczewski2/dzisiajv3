import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export function useBudgetData(year: number) {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [cache, setCache] = useState(
    new Map<number, ReturnType<typeof getEmptyYearData>>()
  );

  const [data, setData] = useState(getEmptyYearData());

  function getEmptyYearData() {
    const empty = () => {
      const o: Record<number, number> = {};
      for (let i = 1; i <= 12; i++) o[i] = 0;
      return o;
    };
    return {
      sums: empty(),
      rates: empty(),
      budgets: empty(),
      incomes: empty(),
      doneExpenses: empty(),
      plannedExpenses: empty(),
      monthlySpending: empty(),
    };
  }

  useEffect(() => {
    if (!session) return;

    if (cache.has(year)) {
      setData(cache.get(year)!);
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      const userEmail = session.user.email;
      const sums: Record<number, number> = {};
      const rates: Record<number, number> = {};
      const budgets: Record<number, number> = {};
      const incomes: Record<number, number> = {};
      const done: Record<number, number> = {};
      const planned: Record<number, number> = {};
      const monthly: Record<number, number> = {};

      for (let i = 1; i <= 12; i++) {
        sums[i] = 0;
        rates[i] = 0;
        budgets[i] = 0;
        incomes[i] = 0;
        done[i] = 0;
        planned[i] = 0;
        monthly[i] = 0;
      }

      const { data: bills } = await supabase
        .from("bills")
        .select("amount,date,include_in_budget,description,done")
        .eq("user_name", userEmail);

      bills?.forEach(({ amount, date, include_in_budget, description, done: isDone }) => {
        const d = new Date(date);
        if (d.getFullYear() !== year) return;
        const m = d.getMonth() + 1;

        if (include_in_budget) {
          if (description === "Bieżące") budgets[m] += amount;
          sums[m] += amount;
          if (isDone) done[m] += amount;
          else planned[m] += amount;
        } else {
          incomes[m] += amount;
        }
      });

      const { data: ratesData } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_name", userEmail)
        .maybeSingle();

      if (ratesData) {
        const keys = [
          "jan", "feb", "mar", "apr", "may", "jun",
          "jul", "aug", "sep", "oct", "nov", "dec",
        ];
        for (let i = 1; i <= 12; i++) {
          rates[i] = ratesData[`${keys[i - 1]}_rate`] || 0;
        }
      }

      const { data: habits } = await supabase
        .from("daily_habits")
        .select("date,daily_spending")
        .eq("user_name", userEmail)
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);

      habits?.forEach(({ date, daily_spending }) => {
        const m = new Date(date).getMonth() + 1;
        monthly[m] += daily_spending;
      });

      const newData = {
        sums,
        rates,
        budgets,
        incomes,
        doneExpenses: done,
        plannedExpenses: planned,
        monthlySpending: monthly,
      };

      setData(newData);
      setCache((prev) => new Map(prev).set(year, newData));
      setLoading(false);
    })();
  }, [session, supabase, year]);

  return {
    data,
    loading,
    setRates: (updater: (prev: Record<number, number>) => Record<number, number>) => {
      setData((prev) => ({
        ...prev,
        rates: updater(prev.rates),
      }));
    },
  };
}
