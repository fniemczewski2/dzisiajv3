// hooks/useBudgetSummary.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";
import type { BudgetCategory, CategorySpending, UncategorisedSummary } from "../types";
import { format, startOfMonth, endOfMonth, getYear, getMonth } from "date-fns";

interface RawBillRow {
  amount: number;
  date: string;
  category_id: string | null;
  is_income: boolean;
}

export function useBudgetSummary(year: number, categories: BudgetCategory[]) {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [summary, setSummary] = useState<CategorySpending[]>([]);
  const [uncategorised, setUncategorised] = useState<UncategorisedSummary>({ spent: 0 });
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
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("bills")
        .select("amount, date, category_id, is_income")
        .eq("user_id", userId)
        .gte("date", yearStart)
        .lte("date", yearEnd)
        .eq("done", false);

      if (error) throw error;

      const bills = (data ?? []) as RawBillRow[];

      const income = bills
        .filter((b) => b.is_income)
        .reduce((sum, b) => sum + b.amount, 0);
      setTotalIncome(income);

      const expenses = bills.filter((b) => !b.is_income);

      const spendMap: Record<string, { yearly: number; monthly: number }> = {};

      for (const bill of expenses) {
        const key = bill.category_id ?? "__none__";
        if (!spendMap[key]) spendMap[key] = { yearly: 0, monthly: 0 };
        spendMap[key].yearly += bill.amount;

        if (bill.date >= monthStart && bill.date <= monthEnd) {
          spendMap[key].monthly += bill.amount;
        }
      }

      const result: CategorySpending[] = categories.map((cat) => {
        const spent   = spendMap[cat.id]?.yearly  ?? 0;
        const mSpent  = spendMap[cat.id]?.monthly ?? 0;
        const limit   = cat.is_monthly ? cat.amount * 12 : cat.amount;
        const mLimit  = cat.is_monthly ? cat.amount : cat.amount / 12;

        return {
          category:           cat,
          spent,
          limit,
          remaining:          limit - spent,
          thisMonthSpent:     mSpent,
          thisMonthLimit:     mLimit,
          thisMonthRemaining: mLimit - mSpent,
        };
      });

      setSummary(result);
      setUncategorised({ spent: spendMap["__none__"]?.yearly ?? 0 });
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, year, categories]);

  useEffect(() => { compute(); }, [compute]);

  return { summary, uncategorised, totalIncome, loading, refresh: compute };
}