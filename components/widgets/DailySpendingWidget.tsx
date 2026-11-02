// components/widgets/DailySpendingForm.tsx
import React, { useId, useMemo } from "react";
import { Coins } from "lucide-react";
import { getAppDate } from "@/lib/dateUtils";
import { useSettings } from "@/hooks/db/useSettings";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useTransactions } from "@/hooks/db/useFinance";
import { dailySpending, formatPln } from "@/lib/finance";

interface DailySpendingFormProps {
  date?: string;
}

export default function DailySpendingWidget({ date }: Readonly<DailySpendingFormProps>) {
  const id = useId();
  const today = getAppDate();
  const targetDate = date ?? today;
  const year = Number(targetDate.slice(0, 4));
  const { settings } = useSettings();
  const { categories } = useBudgetCategories(year);
  const { transactions, loading } = useTransactions({ from: targetDate, to: targetDate });

  const selectedNames = useMemo(() => settings.daily_spending_categories ?? [], [settings.daily_spending_categories]);
  const total = dailySpending(transactions, targetDate, selectedNames, categories);

  if (loading) return null;
  const limit = settings.daily_spending_limit || 0;
  const percentage = limit > 0 ? Math.min(100, Math.max(0, (total / limit) * 100)) : 0;
  const isOverLimit = total > limit;

  return (
    <section aria-labelledby={`${id}-h`} className="widget relative w-full overflow-hidden px-4 py-3">
      <h2 id={`${id}-h`} className="sr-only">
        Wydatki dnia
      </h2>
      <div className="flex items-center justify-between gap-3">
        <Coins className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        <div className="text-right text-sm font-bold text-text-secondary tabular-nums sm:text-base">
          {formatPln(total)}
        </div>
      </div>

      {/* Pasek postępu udający border na samym dole */}
      {limit > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ease-out ${isOverLimit ? "bg-warning" : "bg-(--theme-fill)"}`}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      )}
    </section>
  );
}
