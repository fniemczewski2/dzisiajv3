// hooks/useBudgetSummary.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";
import type { BudgetCategory } from "../types";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface RawBillRow {
  amount: number;
  date: string;
  category_id: string | null;
  is_income: boolean;
  done: boolean;
}

export function useBudgetSummary(year: number, categories: BudgetCategory[]) {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  // Używamy 'any' dla uproszczenia zwracanych, rozszerzonych typów bez modyfikacji globalnego pliku types.ts
  const [summary, setSummary] = useState<any[]>([]);
  const [uncategorised, setUncategorised] = useState<any>({ ySpent: 0, yPlan: 0, mSpent: 0, mPlan: 0 });
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!userId || categories.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const yearStart = `${year}-01-01`;
      const yearEnd   = `${year}-12-31`;
      const now       = new Date();
      
      // Definiujemy ramy czasowe dla bieżącego miesiąca
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");

      // Pobieramy WSZYSTKIE rachunki, usuwamy filtr .eq("done", true)
      const { data, error } = await supabase
        .from("bills")
        .select("amount, date, category_id, is_income, done")
        .eq("user_id", userId)
        .gte("date", yearStart)
        .lte("date", yearEnd);

      if (error) throw error;

      const bills = (data ?? []) as RawBillRow[];

      // Przychody (zakładamy, że liczymy tylko zrealizowane lub wszystkie - wg obecnej logiki wszystkie)
      const income = bills
        .filter((b) => b.is_income)
        .reduce((sum, b) => sum + b.amount, 0);
      setTotalIncome(income);

      const expenses = bills.filter((b) => !b.is_income);

      // Mapa wydatków rozbijająca je na zrealizowane (Spent) i zaplanowane (Plan)
      const spendMap: Record<string, { ySpent: number; mSpent: number; yPlan: number; mPlan: number }> = {};

      for (const bill of expenses) {
        const key = bill.category_id ?? "__none__";
        if (!spendMap[key]) spendMap[key] = { ySpent: 0, mSpent: 0, yPlan: 0, mPlan: 0 };
        
        // Flaga sprawdzająca, czy rachunek wpada w ramy bieżącego miesiąca
        const inMonth = bill.date >= monthStart && bill.date <= monthEnd;

        if (bill.done) {
          spendMap[key].ySpent += bill.amount;
          if (inMonth) spendMap[key].mSpent += bill.amount;
        } else {
          spendMap[key].yPlan += bill.amount;
          if (inMonth) spendMap[key].mPlan += bill.amount;
        }
      }

      const result = categories.map((cat) => {
        const spent    = spendMap[cat.id]?.ySpent  ?? 0;
        const planned  = spendMap[cat.id]?.yPlan   ?? 0;
        const mSpent   = spendMap[cat.id]?.mSpent  ?? 0;
        const mPlanned = spendMap[cat.id]?.mPlan   ?? 0;
        
        const limit  = cat.is_monthly ? cat.amount * 12 : cat.amount;
        const mLimit = cat.is_monthly ? cat.amount : cat.amount / 12;

        return {
          category:           cat,
          spent,
          planned,
          limit,
          remaining:          limit - spent - planned,
          thisMonthSpent:     mSpent,
          thisMonthPlanned:   mPlanned,
          thisMonthLimit:     mLimit,
          thisMonthRemaining: mLimit - mSpent - mPlanned,
        };
      });

      setSummary(result);
      setUncategorised(spendMap["__none__"] ?? { ySpent: 0, yPlan: 0, mSpent: 0, mPlan: 0 });
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, year, categories]);

  useEffect(() => { compute(); }, [compute]);

  return { summary, uncategorised, totalIncome, loading, refresh: compute };
}