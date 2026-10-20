// pages/bills/budget.tsx

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAppDateTime } from "@/lib/dateUtils";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useBudgetSummary } from "@/hooks/db/useBudgetSummary";
import BudgetCategoriesEditor from "@/components/budget/BudgetCategoriesEditor";
import BudgetOverview from "@/components/budget/BudgetOverview";
import YearTable from "@/components/budget/YearTable";
import { useRecurringBills } from "@/hooks/db/useFinance";
import { SkeletonBudgetTable } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export default function BudgetPage() {
  const appDate = getAppDateTime();
  const currentYear = appDate.getFullYear();
  const currentMonth = appDate.getMonth();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const displayDate = new Date(year, month);

  const { bills: recurringBills } = useRecurringBills();

  const { categories, loading: catsLoading, fetchCategories } = useBudgetCategories(year);

  const {
    summary,
    uncategorised,
    totalIncome,
    loading: summaryLoading,
    refresh: refreshSummary,
  } = useBudgetSummary(year, month, categories, recurringBills);

  const handleCategoriesChange = () => {
    void fetchCategories();
    void refreshSummary();
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isLoading = summaryLoading || catsLoading;

  return (
    <>
      <Seo
        title="Budżet"
        description="Zaplanuj budżet w kategoriach i porównuj go z wydatkami w ujęciu miesięcznym i rocznym."
        canonical="https://dzisiaj.fun/bills/budget"
        keywords="budżet domowy, wydatki, oszczędzanie, statystyki finansowe, portfel"
      />
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="page-title sr-only mx-auto text-center first-letter:uppercase sm:not-sr-only">Budżet</h1>

          <div className="card flex items-center p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
              type="button"
              title="Poprzedni miesiąc"
              aria-label="Poprzedni miesiąc"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <h2 className="period-title">{format(displayDate, "LLLL yyyy", { locale: pl })}</h2>

            <button
              onClick={handleNextMonth}
              className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
              type="button"
              title="Następny miesiąc"
              aria-label="Następny miesiąc"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mx-auto w-full max-w-2xl">
          <SkeletonBudgetTable rows={6} />
        </div>
      ) : (
        <div className="mx-auto mb-6 w-full max-w-2xl space-y-6">
          <BudgetOverview
            summary={summary}
            uncategorised={uncategorised}
            totalIncome={totalIncome}
            loading={summaryLoading}
            selectedMonth={month}
          />

          <BudgetCategoriesEditor year={year} selectedMonth={month} onCategoriesChange={handleCategoriesChange} />
        </div>
      )}

      {!isLoading && (
        <div className="flex w-full justify-center">
          <YearTable year={year} />
        </div>
      )}
    </>
  );
}
