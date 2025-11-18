// pages/bills/budget.tsx
import React, { useState, useMemo } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import BudgetStatsTable from "../../components/budget/StatsTable";
import BudgetControls from "../../components/budget/BudgetControls";
import MonthlyBudgetTable from "../../components/budget/MonthlyTable";
import SummaryTable from "../../components/budget/SummaryTable";
import { useBudgetData } from "../../hooks/useBudget";
import { useSession } from "@supabase/auth-helpers-react";
import { getAppDateTime } from "../../lib/dateUtils";
import LoadingState from "../../components/LoadingState";

const MONTH_NAMES = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "paź",
  "lis",
  "gru",
];

export default function BudgetPage() {
  const currentYear = getAppDateTime().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const { data, loading, loadedMonths, updateRate, saveRates } = useBudgetData(
    year,
    [1, 12]
  );

  const handleBack = () => {
    const parts = router.pathname.split("/").filter(Boolean);
    router.push(parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/");
  };

  const onPrev = () => setYear((y) => y - 1);
  const onNext = () => setYear((y) => y + 1);

  const rows = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthData = data[month];
      const sum = monthData?.sum ?? 0;
      const rate = monthData?.rate ?? 0;
      const hours = rate > 0 ? Math.round(sum / rate) : 0;

      return {
        month,
        monthName: MONTH_NAMES[i],
        sum,
        rate,
        hours,
      };
    });
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    await saveRates();
    setSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <>
      <Head>
        <title>Budżet – {year}</title>
      </Head>
      <Layout>
        <div className="flex justify-between gap-3 items-center mb-4">
          <span className="flex sm:flex-1 flex-nowrap">
          <button
            onClick={handleBack}
            className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            aria-label="Wróć"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl ml-2 font-semibold">Statystyki</h2>
          </span>
          <div className="items-center sm:flex-1 justify-center flex">
            <button
              onClick={onPrev}
              className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Poprzedni rok"
              aria-label="Poprzedni rok"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mx-4">{year}</h2>
            <button
              onClick={onNext}
              className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Następny rok"
              aria-label="Następny rok"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
          </div>
          <div className="sm:flex-1"> </div>
        </div>
        {loading ? (
          <LoadingState />
        ) : (
          <>
          <div className="flex flex-wrap gap-2 sm:gap-6 w-full justify-center">
          <div>
            <BudgetControls
              isEditing={isEditing}
              saving={saving}
              onSave={handleSave}
              onCancel={handleCancel}
              onEdit={() => setIsEditing(true)}
            />

            <BudgetStatsTable
              rows={rows}
              isEditing={isEditing}
              onRateChange={updateRate}
            />
            </div>
            <SummaryTable
              data={data}
              monthNames={MONTH_NAMES}
              loadedMonths={loadedMonths}
            />
            <MonthlyBudgetTable
              data={data}
              monthNames={MONTH_NAMES}
              loadedMonths={loadedMonths}
            />
            </div>
          </>
        )}
      </Layout>
    </>
  );
}

BudgetPage.auth = true;