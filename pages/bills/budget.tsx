// pages/bills/budget.tsx

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/router";
import { getAppDateTime } from "../../lib/dateUtils";
import { useBudgetCategories } from "../../hooks/useBudgetCategories";
import { useBudgetSummary } from "../../hooks/useBudgetSummary";
import BudgetCategoriesEditor from "../../components/budget/BudgetCategoriesEditor";
import BudgetOverview from "../../components/budget/BugdetOverview";
import LoadingState from "../../components/LoadingState";
import MonthlyBudgetTable from "../../components/budget/MonthlyTable";
import BudgetStatsTable from "../../components/budget/StatsTable";
import SummaryTable from "../../components/budget/SummaryTable";
import { useBudgetData } from "../../hooks/useBudget";
import BudgetControls from "../../components/budget/BudgetControls";
import { useToast } from "../../providers/ToastProvider";

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
      toastId = toast.loading("Ładowanie finansów...");
    }

    return () => {
      if (toastId && toast.dismiss) {
        toast.dismiss(toastId);
      }
    };
  }, [isLoading, toast]);

  return (
    <>
      <Head>
        <title>Budżet – {year}</title>
      </Head>
      <Layout>
        <div className="flex justify-between gap-3 items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            aria-label="Wróć"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 card rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-2 bg-transparent rounded-lg hover:bg-surface"
              aria-label="Poprzedni rok"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold text-text mx-2 tabular-nums">{year}</h2>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="p-2 bg-transparent rounded-lg hover:bg-surface"
              aria-label="Następny rok"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-10" />
        </div>

        {catsLoading ? (
          <LoadingState />
        ) : (
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
        )}
        {loading ? <LoadingState /> : (
          <div className="flex flex-wrap gap-2 sm:gap-6 w-full justify-center">
            <div>
              <BudgetControls
                isEditing={isEditing}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
                onEdit={() => setIsEditing(true)}
              />
              <BudgetStatsTable rows={rows} isEditing={isEditing} onRateChange={updateRate} />
            </div>
            <SummaryTable data={data} monthNames={MONTH_NAMES} loadedMonths={loadedMonths} />
            <MonthlyBudgetTable data={data} monthNames={MONTH_NAMES} loadedMonths={loadedMonths} />
          </div>
        )}
      </Layout>
    </>
  );
}
