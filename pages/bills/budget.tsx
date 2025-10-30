import React, { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import BudgetStatsTable from "../../components/budget/StatsTable";
import BudgetControls from "../../components/budget/BudgetControls";
import MonthlyBudgetTable from "../../components/budget/MonthlyTable";
import SummaryTable from "../../components/budget/SummaryTable";
import { useBudgetData } from "../../hooks/useBudget";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { getPolishDate } from "../../hooks/getPolishDate";

const MONTH_NAMES = [
  "sty", "lut", "mar", "kwi", "maj", "cze",
  "lip", "sie", "wrz", "paź", "lis", "gru",
];

export default function BudgetPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const currentYear = getPolishDate().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const { data, loading, setRates } = useBudgetData(year);

  const router = useRouter();

  const handleBack = () => {
    const parts = router.pathname.split("/").filter(Boolean);
    router.push(parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/");
  };

  const onPrev = () => setYear((y) => y - 1);
  const onNext = () => setYear((y) => y + 1);

  useEffect(() => {
    const result = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const sum = data.sums[month + 1] ?? 0; // shifted
      const rate = data.rates[month] ?? 0;
      const hours = rate > 0 ? Math.round(sum / rate) : 0;
      return {
        month,
        monthName: MONTH_NAMES[i],
        sum,
        rate,
        hours,
      };
    });
    setRows(result);
  }, [data]);

  const saveRates = async () => {
    if (!session) return;
    setSaving(true);
    const email = session.user.email;
    const payload: any = { user_name: email };
    Object.entries(data.rates).forEach(([monthStr, rate]) => {
      const m = parseInt(monthStr);
      const key = [
        "jan", "feb", "mar", "apr", "may", "jun",
        "jul", "aug", "sep", "oct", "nov", "dec",
      ][m - 1] + "_rate";
      payload[key] = rate;
    });
    await supabase.from("budgets").upsert(payload, { onConflict: "user_name" });
    setSaving(false);
    setIsEditing(false);
  };

  return (
    <>
      <Head>
        <title>Budżet – {year}</title>
      </Head>
      <Layout>
        <div className="flex justify-start gap-3 items-center mb-4">
          <button
            onClick={handleBack}
            className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-semibold">Statystyki</h2>
          <div className="w-full items-center justify-center flex">
          <button
            onClick={onPrev}
            className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            title="Poprzedni rok"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold mx-4">{year}</h2>
          <button
            onClick={onNext}
            className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            title="Następny rok"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          </div>
        </div>

        {(loading || !session) ? (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
          </div>
        ) : (
          <>
            <BudgetControls
              isEditing={isEditing}
              saving={saving}
              onSave={saveRates}
              onCancel={() => setIsEditing(false)}
              onEdit={() => setIsEditing(true)}
            />

            <BudgetStatsTable
              rows={rows}
              isEditing={isEditing}
              rates={data.rates}
              onRateChange={(month, value) =>
                setRates((prev) => ({ ...prev, [month]: value }))
              }
            />

            <SummaryTable
              incomes={data.incomes}
              doneExpenses={data.doneExpenses}
              plannedExpenses={data.plannedExpenses}
              monthNames={MONTH_NAMES}
            />

            <h3 className="font-bold mb-2">Wydatki bieżące</h3>
            <MonthlyBudgetTable
              budgets={data.budgets}
              monthlySpending={data.monthlySpending}
              monthNames={MONTH_NAMES}
            />
          </>
        )}
      </Layout>
    </>
  );
}

BudgetPage.auth = true;
