// hooks/useBudgetSummary.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import type { BudgetCategory, RawBillRow, SummaryItem } from "@/types/bills";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { calculateExpectedYearlyLimit } from "@/lib/budgetUtils";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";

interface SpendBucket {
  ySpent: number;
  yPlan: number;
  mSpent: number;
  mPlan: number;
}

export function useBudgetSummary(year: number, monthIndex: number, categories: BudgetCategory[]) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [uncategorised, setUncategorised] = useState<SpendBucket>({ ySpent: 0, yPlan: 0, mSpent: 0, mPlan: 0 });
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const withRetry = useRetry();

  const compute = useCallback(async () => {
    if (!userId) {

      throw new Error("Unauthorized");
    }

    if (categories.length === 0) {
      setSummary([]);
      setUncategorised({ ySpent: 0, yPlan: 0, mSpent: 0, mPlan: 0 });
      setTotalIncome(0);
      return;
    }

    setLoading(true);
    try {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const targetDateForMonth = new Date(year, monthIndex, 1);
      const monthStart = format(startOfMonth(targetDateForMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(targetDateForMonth), "yyyy-MM-dd");

      const { data, error } = await withRetry(async () =>
        supabase
          .from("bills")
          .select("amount, date, category_id, is_income, done")
          .eq("user_id", userId)
          .gte("date", yearStart)
          .lte("date", yearEnd)
      );

      if (error) throw error;

      const bills = (data ?? []) as RawBillRow[];
      const income = bills.filter((b) => b.is_income).reduce((sum, b) => sum + b.amount, 0);
      setTotalIncome(income);

      const expenses = bills.filter((b) => !b.is_income);
      const spendMap: Record<string, { ySpent: number; mSpent: number; yPlan: number; mPlan: number }> = {};

      for (const bill of expenses) {
        const key = bill.category_id ?? "__none__";
        if (!spendMap[key]) spendMap[key] = { ySpent: 0, mSpent: 0, yPlan: 0, mPlan: 0 };
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
        const spent = spendMap[cat.id]?.ySpent ?? 0;
        const planned = spendMap[cat.id]?.yPlan ?? 0;
        const mSpent = spendMap[cat.id]?.mSpent ?? 0;
        const mPlanned = spendMap[cat.id]?.mPlan ?? 0;

        const limit = calculateExpectedYearlyLimit(cat, monthIndex, year);
        const mLimit = cat.is_monthly
          ? cat.monthly_amounts?.[monthIndex] || 0
          : (cat.monthly_amounts?.[0] || 0) / 12;

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

      setSummary(result);
      setUncategorised(spendMap["__none__"] ?? { ySpent: 0, yPlan: 0, mSpent: 0, mPlan: 0 });
    } catch {
      toast.error("Błąd pobierania statystyk budżetu.");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, year, monthIndex, categories, toast, withRetry]);

  useEffect(() => { compute(); }, [compute]);

  return { summary, uncategorised, totalIncome, loading, refresh: compute };
}
