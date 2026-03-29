// pages/bills/budget.tsx

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Coins } from "lucide-react";
import { useRouter } from "next/router";
import { getAppDateTime } from "../../lib/dateUtils";
import { useBudgetCategories } from "../../hooks/useBudgetCategories";
import { useBudgetSummary } from "../../hooks/useBudgetSummary";
import BudgetCategoriesEditor from "../../components/budget/BudgetCategoriesEditor";
import BudgetOverview from "../../components/budget/BugdetOverview";
import BudgetStatsTable from "../../components/budget/StatsTable";
import SummaryTable from "../../components/budget/SummaryTable";
import { useBudgetData } from "../../hooks/useBudget";
import BudgetControls from "../../components/budget/BudgetControls";
import { useToast } from "../../providers/ToastProvider";
import Seo from "../../components/SEO";

export default function BudgetPage() {
  const currentYear = getAppDateTime().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const MONTH_NAMES = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
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
  } = useBudgetSummary(year, categories);

  const handleBack = () => {
    const parts = router.pathname.split("/").filter(Boolean);
    router.push(parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/");
  };

  const handleCategoriesChange = () => {
    fetchCategories();
    refreshSummary();
  };

  const rows = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthData = data[month];
    const sum = monthData?.sum ?? 0;
    const rate = monthData?.rate ?? 0;
    return { month, monthName: MONTH_NAMES[i], sum, rate, hours: rate > 0 ? Math.round(sum / rate) : 0 };
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

  useEffect(() => {
    let toastId: string | undefined;
    
    if (isLoading && toast.loading) {
      toastId = toast.loading("Ładowanie budżetu...");
    }

    return () => {
      if (toastId && toast.dismiss) {
        toast.dismiss(toastId);
      }
    };
  }, [isLoading, toast]);

  return (
    <>
      <Seo
        title="Budżet - Dzisiaj v3"
        description="Analizuj swoje wydatki, przeglądaj statystyki finansowe i mądrze zaplanuj domowy budżet."
        canonical="https://dzisiajv3.vercel.app/bills/budget"
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
            <h2 className="font-bold text-xl text-text mx-auto text-center capitalize tracking-wide">
              Budżet
            </h2>
            <div className="card flex items-center justify-between gap-2 p-2 rounded-xl">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-2 bg-transparent rounded-lg hover:bg-surface transition-colors"
              aria-label="Poprzedni rok"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold text-text mx-2 tabular-nums">{year}</h2>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="p-2 bg-transparent rounded-lg hover:bg-surface transition-colors"
              aria-label="Następny rok"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            </div>
          </div>

          <div className="w-10" />
        </div>

        <div className="max-w-2xl mx-auto w-full space-y-6 mb-6">
          <BudgetOverview
            summary={summary}
            uncategorised={uncategorised}
            totalIncome={totalIncome}
            loading={summaryLoading}
          />

          <BudgetCategoriesEditor
            year={year}
            onCategoriesChange={handleCategoriesChange}
          />
        </div>

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
    </>
  );
}