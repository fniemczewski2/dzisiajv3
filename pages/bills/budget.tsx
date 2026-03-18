// pages/bills/budget.tsx

import React, { useState } from "react";
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

export default function BudgetPage() {
  const currentYear = getAppDateTime().getFullYear();
  const [year, setYear] = useState(currentYear);
  const router = useRouter();

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
          <div className="max-w-2xl mx-auto w-full space-y-6">
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
      </Layout>
    </>
  );
}

BudgetPage.auth = true;