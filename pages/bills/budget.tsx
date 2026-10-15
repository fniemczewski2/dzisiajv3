// pages/bills/budget.tsx

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Coins } from "lucide-react";
import { useRouter } from "next/router";
import { getAppDateTime } from "@/lib/dateUtils";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useBudgetSummary } from "@/hooks/db/useBudgetSummary";
import BudgetCategoriesEditor from "@/components/budget/BudgetCategoriesEditor";
import BudgetOverview from "@/components/budget/BudgetOverview";
import YearTable from "@/components/budget/YearTable";
import { useRecurringBills } from "@/hooks/db/useFinance";
import { SkeletonBudgetTable } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";

const MONTH_NAMES = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

export default function BudgetPage() {
  const appDate = getAppDateTime();
  const currentYear = appDate.getFullYear();
  const currentMonth = appDate.getMonth();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  
  const router = useRouter();
  
  const { bills: recurringBills } = useRecurringBills();

  const {
    categories,
    loading: catsLoading,
    fetchCategories,
  } = useBudgetCategories(year);

  const {
    summary,
    uncategorised,
    totalIncome,
    loading: summaryLoading,
    refresh: refreshSummary,
  } = useBudgetSummary(year, month, categories, recurringBills);

  const handleBack = () => {
    const parts = router.pathname.split("/").filter(Boolean);
    void router.push(parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/");
  };

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
        <div className="flex justify-between gap-3 items-center mb-6">
          <button
            onClick={handleBack}
            type='button'
            className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-text-secondary hover:text-text hover:bg-surface-hover transition-colors shadow-sm"
            aria-label="Wróć"
          >
            <Coins className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="page-title mx-auto text-center first-letter:uppercase sr-only sm:not-sr-only">
              Budżet
            </h1>
            <div className="card flex items-center justify-between gap-2 p-2 rounded-xl">
            <button
              onClick={handlePrevMonth}
              type='button'
              className="p-2 bg-transparent rounded-lg hover:bg-surface transition-colors"
              aria-label="Poprzedni miesiąc"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <h2 className="text-sm sm:text-lg font-bold text-text mx-2 tabular-nums capitalize w-28 sm:w-36 text-center">
              {MONTH_NAMES[month].toUpperCase()} {year}
            </h2>
            
            <button
              onClick={handleNextMonth}
              type='button'
              className="p-2 bg-transparent rounded-lg hover:bg-surface transition-colors"
              aria-label="Następny miesiąc"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            </div>
          </div>

          <div className="w-10" />
        </div>

        {isLoading ? (
          <div className="max-w-2xl mx-auto w-full">
            <SkeletonBudgetTable rows={6} />
          </div>
        ) : (
        <div className="max-w-2xl mx-auto w-full space-y-6 mb-6">
          <BudgetOverview
            summary={summary}
            uncategorised={uncategorised}
            totalIncome={totalIncome}
            loading={summaryLoading}
            selectedMonth={month}
          />

          <BudgetCategoriesEditor
            year={year}
            selectedMonth={month}
            onCategoriesChange={handleCategoriesChange}
          />
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
