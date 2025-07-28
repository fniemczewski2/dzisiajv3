import React, { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { ChevronLeft, Loader2 } from "lucide-react";

import BudgetStatsTable from "../../components/budget/StatsTable";
import BudgetControls from "../../components/budget/BudgetControls";
import MonthlyBudgetTable from "../../components/budget/MonthlyTable";
import SummaryTable from "../../components/budget/SummaryTable";
import { useRouter } from "next/router";

const MONTH_NAMES = [
  "sty", "lut", "mar", "kwi", "maj", "cze",
  "lip", "sie", "wrz", "paź", "lis", "gru",
];

export default function BudgetPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [sums, setSums] = useState<Record<number, number>>({});
  const [rates, setRates] = useState<Record<number, number>>({});
  const [budgets, setBudgets] = useState<Record<number, number>>({});
  const [incomes, setIncomes] = useState<Record<number, number>>({});
  const [doneExpenses, setDoneExpenses] = useState<Record<number, number>>({});
  const [plannedExpenses, setPlannedExpenses] = useState<Record<number, number>>({});
  const [monthlySpending, setMonthlySpending] = useState<Record<number, number>>({});
  const [rows, setRows] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const handleBack = () => {
    const pathParts = router.pathname.split("/").filter(Boolean);
    if (pathParts.length > 1) {
      const parentPath = "/" + pathParts.slice(0, -1).join("/");
      router.push(parentPath);
    } else {
      router.push("/"); // fallback: home
    }
  };

  useEffect(() => {
  if (!session) return;
  (async () => {
    const userEmail = session.user.email;

    const localSums: Record<number, number> = {};
    const localRates: Record<number, number> = {};
    const localBudgets: Record<number, number> = {};
    const localExcluded: Record<number, number> = {};
    const localIncomes: Record<number, number> = {};
    const localDone: Record<number, number> = {};
    const localPlanned: Record<number, number> = {};

    for (let m = 1; m <= 12; m++) {
      localSums[m] = 0;
      localRates[m] = 0;
      localBudgets[m] = 0;
      localExcluded[m] = 0;
      localIncomes[m] = 0;
      localDone[m] = 0;
      localPlanned[m] = 0;
    }

    // Bieżące (budżet zaplanowany)
    const { data: current } = await supabase
      .from("bills")
      .select("amount,date")
      .eq("user_name", userEmail)
      .eq("include_in_budget", true)
      .eq("description", "Bieżące");

    current?.forEach(({ amount, date }) => {
      const m = new Date(date).getMonth() + 1;
      localBudgets[m] += amount;
    });

    // Wszystkie rachunki – dla obliczeń sums, incomes, done/planned
    const { data: bills } = await supabase
      .from("bills")
      .select("amount,date,include_in_budget,done")
      .eq("user_name", userEmail);

    bills?.forEach(({ amount, date, include_in_budget, done }) => {
      const m = new Date(date).getMonth() + 1;

      if (include_in_budget) {
        localSums[m] += amount;
        if (done) {
          localDone[m] += amount;
        } else {
          localPlanned[m] += amount;
        }
      } else {
        localIncomes[m] += amount;
      }
    });

    // Stawki godzinowe
    const { data: budData } = await supabase
      .from("budgets")
      .select("jan_rate,feb_rate,mar_rate,apr_rate,may_rate,jun_rate,jul_rate,aug_rate,sep_rate,oct_rate,nov_rate,dec_rate")
      .eq("user_name", userEmail)
      .maybeSingle();

    if (!budData)
      await supabase.from("budgets").insert({ user_name: userEmail });

    if (budData) {
      for (let i = 1; i <= 12; i++) {
        const key = [
          "jan","feb","mar","apr","may","jun",
          "jul","aug","sep","oct","nov","dec"
        ][i - 1] + "_rate";
        localRates[i] = (budData as any)[key] || 0;
      }
    }

    setSums(localSums);
    setRates(localRates);
    setBudgets(localBudgets);
    setIncomes(localIncomes);
    setDoneExpenses(localDone);
    setPlannedExpenses(localPlanned);
    setLoading(false);
  })();
}, [session, supabase]);


  useEffect(() => {
    const res = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const sum = sums[month] ?? 0;
      const rate = rates[month] ?? 0;
      return {
        month,
        monthName: MONTH_NAMES[i],
        sum,
        rate,
        hours: rate > 0 ? Math.round(sum / rate) : 0,
      };
    });
    setRows(res);
  }, [sums, rates]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const userEmail = session.user.email;
      const { data } = await supabase
        .from("daily_habits")
        .select("date,daily_spending")
        .eq("user_name", userEmail)
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);
      const localMonthly: Record<number, number> = {};
      for (let m = currentMonth; m <= 12; m++) localMonthly[m] = 0;
      data?.forEach(({ date, daily_spending }) => {
        const m = new Date(date).getMonth() + 1;
        if (localMonthly[m] !== undefined) {
          localMonthly[m] += daily_spending;
        }
      });
      setMonthlySpending(localMonthly);
    })();
  }, [session, supabase]);

  const saveRates = async () => {
    if (!session) return;
    setSaving(true);
    const ue = session.user.email;
    const p: any = { user_name: ue };
    Object.entries(rates).forEach(([mStr, r]) => {
      const i = +mStr;
      p[["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][i - 1] + "_rate"] = r;
    });
    await supabase.from("budgets").upsert(p, { onConflict: "user_name" });
    setSaving(false);
    setIsEditing(false);
  };

  return (
    <>
      <Head>
        <title>Budżet – Dzisiaj</title>
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
        </div>
        {(!session || loading) && (
            <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
            </div>
          )}
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
          rates={rates}
          onRateChange={(month, value) =>
            setRates((prev) => ({ ...prev, [month]: value }))
          }
        />
        <SummaryTable
          incomes={incomes}
          doneExpenses={doneExpenses}
          plannedExpenses={plannedExpenses}
          monthNames={MONTH_NAMES}
        />


        <h3 className="font-bold mb-2">Wydatki bieżące</h3>
        <MonthlyBudgetTable
          budgets={budgets}
          monthlySpending={monthlySpending}
          monthNames={MONTH_NAMES}
        />
      </Layout>
    </>
  );
}

BudgetPage.auth = true;
