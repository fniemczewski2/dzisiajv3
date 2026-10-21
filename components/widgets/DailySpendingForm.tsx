// components/widgets/DailySpendingForm.tsx
//
// Wydatki dnia liczone z transakcji w kategoriach wskazanych w Ustawieniach
// (Finanse → kategorie wydatków dnia). Szybkie dodanie wydatku tworzy
// transakcję, więc kwota trafia też do budżetu i podsumowania miesiąca.

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

export default function DailySpendingForm({ date }: Readonly<DailySpendingFormProps>) {
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

  return (
    <section aria-labelledby={`${id}-h`} className="widget px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Coins className="h-5 w-5 sm:h-6 sm:w-6" />
        <div className="text-right text-sm font-bold text-text-secondary tabular-nums sm:text-base">
          {formatPln(total)}
        </div>
      </div>
    </section>
  );
}
