// pages/bills/budget.tsx

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Coins } from "lucide-react";
import { useRouter } from "next/router";
import { getAppDateTime } from "@/lib/dateUtils";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useBudgetSummary } from "@/hooks/db/useBudgetSummary";
import BudgetCategoriesEditor from "@/components/budget/BudgetCategoriesEditor";
import BudgetOverview from "@/components/budget/BudgetOverview";
import BudgetStatsTable from "@/components/budget/StatsTable";
import SummaryTable from "@/components/budget/SummaryTable";
import { SkeletonBudgetTable } from "@/components/ui/Skeleton";
import { useBudgetData } from "@/hooks/db/useBudget";
import BudgetControls from "@/components/budget/BudgetControls";
import { useToast } from "@/providers/ToastProvider";
import Seo from "@/components/ui/SEO";

const MONTH_NAMES = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

export default function BudgetPage() {
  const appDate = getAppDateTime();
  const currentYear = appDate.getFullYear();
  const currentMonth = appDate.getMonth();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const { data, loading, loadedMonths, updateRate, saveRates } = useBudgetData(year, [1, 12]);

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
  } = useBudgetSummary(year, month, categories);

  const handleBack = () => {
    const parts = router.pathname.split("/").filter(Boolean);
    router.push(parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/");
  };

  const handleCategoriesChange = () => {
    fetchCategories();
    refreshSummary();
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

  const rows = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const monthData = data[m];
    const sum = monthData?.sum ?? 0;
    const rate = monthData?.rate ?? 0;
    return { month: m, monthName: MONTH_NAMES[i], sum, rate, hours: rate > 0 ? Math.round(sum / rate) : 0 };
  }), [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRates();
      toast.success("Zmieniono pomyślnie.");
      setIsEditing(false);
    } catch {
      toast.error("Wystąpił błąd podczas zapisywania.");
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loading || summaryLoading || catsLoading;

    <>
      <Seo
        title="Budżet | Dzisiaj.Fun"
        description="Analizuj swoje wydatki, przeglądaj statystyki finansowe i mądrze zaplanuj domowy budżet."
        canonical="https://dzisiaj.fun/bills/budget"
        keywords="budżet domowy, wydatki, oszczędzanie, statystyki finansowe, portfel"
      />
        <div className="flex justify-between gap-3 items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
            aria-label="Wróć"
          >
            <Coins className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <h2 className="font-bold text-xl text-text mx-auto text-center capitalize tracking-wide hidden sm:block">
              Budżet
            </h2>
            <div className="card flex items-center justify-between gap-2 p-2 rounded-xl">
            <button
              onClick={handlePrevMonth}
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
        <div className="flex flex-wrap gap-2 sm:gap-6 w-full justify-center">
            <BudgetControls
              isEditing={isEditing}
              saving={saving}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              onEdit={() => setIsEditing(true)}
            />
            <BudgetStatsTable rows={rows} isEditing={isEditing} onRateChange={updateRate} />
            <SummaryTable data={data} monthNames={MONTH_NAMES} loadedMonths={loadedMonths} />
        </div>
        )}
    </>
}