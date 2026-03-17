// hooks/useBudget.ts
import { useState, useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";

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
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<YearData>({});
  const [loading, setLoading] = useState(true);
  const [loadedMonths, setLoadedMonths] = useState<Set<number>>(new Set());

  const keys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const startMonth = monthRange?.[0] ?? 1;
  const endMonth = monthRange?.[1] ?? 12;

  const getEmptyMonthData = (): MonthData => ({
    sum: 0, rate: 0, budget: 0, income: 0,
    doneExpense: 0, plannedExpense: 0, monthlySpending: 0,
  });

  const fetchMonthData = async (month: number): Promise<MonthData> => {
    if (!userId) return getEmptyMonthData();

    const monthStr = String(month).padStart(2, "0");
    const dateStart = `${year}-${monthStr}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = String(nextMonth).padStart(2, "0");
    const dateEnd = `${nextYear}-${nextMonthStr}-01`;

    const { data: bills } = await supabase
      .from("bills")
      .select("amount,date,is_income,description,done")
      .eq("user_id", userId) // PRZYWRÓCONO: Zabezpieczenie danych użytkownika
      .gte("date", dateStart)
      .lt("date", dateEnd);

    const { data: habits } = await supabase
      .from("daily_habits")
      .select("date,daily_spending")
      .eq("user_id", userId) // PRZYWRÓCONO: Zabezpieczenie danych użytkownika
      .gte("date", dateStart)
      .lt("date", dateEnd);

    const monthData = getEmptyMonthData();

    (bills as any[])?.forEach(({ amount, is_income, description, done: isDone }) => {
      if (!is_income) {
        if (description === "Bieżące") monthData.budget += amount;
        monthData.sum += amount;
        if (isDone) monthData.doneExpense += amount;
        else monthData.plannedExpense += amount;
      } else {
        monthData.income += amount;
      }
    });

    (habits as any[])?.forEach(({ daily_spending }) => {
      monthData.monthlySpending += daily_spending;
    });

    return monthData;
  };

  const fetchRates = async () => {
    if (!userId) return {};
    const { data: ratesData } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId) // PRZYWRÓCONO: Inaczej maybeSingle wywali błąd na wielu userach
      .maybeSingle();

    if (!ratesData) return {};
    const rates: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      rates[i] = ratesData[`${keys[i - 1]}_rate`] || 0;
    }
    return rates;
  };

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const updateRate = (month: number, rate: number) => {
    setData((prev) => ({
      ...prev,
      [month]: { ...(prev[month] || getEmptyMonthData()), rate },
    }));
  };

  const saveRates = async () => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const payload: any = { user_id: userId };
      Object.entries(data).forEach(([monthStr, monthData]) => {
        const m = parseInt(monthStr);
        // Zabezpieczenie przed pustym stringiem/NaN powodującym błąd 400
        if (m >= 1 && m <= 12) payload[`${keys[m - 1]}_rate`] = Number(monthData.rate) || 0;
      });

      // ZMIANA: Pobieramy ID wpisu, aby bezpiecznie zaktualizować/stworzyć wiersz
      // Baza nie rzuci już błędem onConflict.
      const { data: existing } = await supabase
        .from("budgets")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      let dbError;

      if (existing?.id) {
        const { error } = await supabase
          .from("budgets")
          .update(payload)
          .eq("id", existing.id);
        dbError = error;
      } else {
        const { error } = await supabase
          .from("budgets")
          .insert([payload]);
        dbError = error;
      }

      if (dbError) throw dbError;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, year, startMonth, endMonth]);

  return { data, loading, loadedMonths, updateRate, saveRates, refetch: loadData };
}