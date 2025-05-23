import React, { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Edit2, Save, X } from "lucide-react";
import { Loader2 } from "lucide-react";

const MONTH_NAMES = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

type BudgetRow = {
  month: number;
  monthName: string;
  sum: number;
  rate: number;
  hours: number;
};

export default function BudgetPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const now = new Date();
  const currentYear = now.getFullYear();

  const [sums, setSums] = useState<Record<number, number>>({});
  const [rates, setRates] = useState<Record<number, number>>({});
  const [budgets, setBudgets] = useState<Record<number, number>>({});
  const [excluded, setExcluded] = useState<Record<number, number>>({});
  const [monthlySpending, setMonthlySpending] = useState<
    Record<number, number>
  >({});
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentMonth = now.getMonth() + 1; // 1-12
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const [dailySpendingByDate, setDailySpendingByDate] = useState<
    Record<number, number>
  >({});

  // Fetch annual sums, rates, budgets, excluded
  useEffect(() => {
    if (!session) return;
    (async () => {
      const userEmail = session.user.email;
      const startMonth = now.getMonth() + 1;
      const localSums: Record<number, number> = {};
      const localRates: Record<number, number> = {};
      const localBudgets: Record<number, number> = {};
      const localExcluded: Record<number, number> = {};
      for (let m = startMonth; m <= 12; m++) {
        localSums[m] = 0;
        localRates[m] = 0;
        localBudgets[m] = 0;
        localExcluded[m] = 0;
      }
      const { data: bieżące } = await supabase
        .from("bills")
        .select("amount,date")
        .eq("user_name", userEmail)
        .eq("include_in_budget", true)
        .eq("description", "Bieżące");
      bieżące?.forEach(({ amount, date }) => {
        const m = new Date(date).getMonth() + 1;
        if (localBudgets[m] !== undefined) localBudgets[m] += amount;
      });
      const { data: bills } = await supabase
        .from("bills")
        .select("amount,date")
        .eq("user_name", userEmail)
        .eq("include_in_budget", true);
      bills?.forEach(({ amount, date }) => {
        const m = new Date(date).getMonth() + 1;
        if (localSums[m] !== undefined) localSums[m] += amount;
      });
      const { data: excl } = await supabase
        .from("bills")
        .select("amount,date")
        .eq("user_name", userEmail)
        .eq("include_in_budget", false);
      excl?.forEach(({ amount, date }) => {
        const m = new Date(date).getMonth() + 1;
        if (localExcluded[m] !== undefined) localExcluded[m] += amount;
      });
      const { data: budData } = await supabase
        .from("budgets")
        .select(
          "jan_rate,feb_rate,mar_rate,apr_rate,may_rate,jun_rate,jul_rate,aug_rate,sep_rate,oct_rate,nov_rate,dec_rate"
        )
        .eq("user_name", userEmail)
        .maybeSingle();
      if (!budData)
        await supabase.from("budgets").insert({ user_name: userEmail });
      if (budData)
        for (let i = 1; i <= 12; i++) {
          const key =
            [
              "jan",
              "feb",
              "mar",
              "apr",
              "may",
              "jun",
              "jul",
              "aug",
              "sep",
              "oct",
              "nov",
              "dec",
            ][i - 1] + "_rate";
          localRates[i] = (budData as any)[key] || 0;
        }
      setSums(localSums);
      setRates(localRates);
      setBudgets(localBudgets);
      setExcluded(localExcluded);
      setLoading(false);
    })();
  }, [session, supabase]);

  // Compute rows
  useEffect(() => {
    const res: Object[] = Object.entries(sums).map(([mStr, sum]) => {
      const m = +mStr;
      const r = rates[m] || 0;
      return {
        month: m,
        monthName: MONTH_NAMES[m - 1],
        sum,
        rate: r,
        hours: r ? Math.round(sum / r) : 0,
      };
    });
    setRows(res as BudgetRow[]);
  }, [sums, rates]);

  // Fetch monthly spending
  useEffect(() => {
    if (!session) return;
    (async () => {
      const userEmail = session.user.email;
      const monthStr = String(currentMonth).padStart(2, "0");
      const firstDay = `${currentYear}-${monthStr}-01`;
      const lastDay = `${currentYear}-${monthStr}-${daysInMonth}`;
      const { data, error } = await supabase
        .from("daily_habits")
        .select("date,daily_spending")
        .eq("user_name", userEmail)
        .gte("date", firstDay)
        .lte("date", lastDay);
      if (error) {
        console.error(error.message);
        return;
      }
      const map: Record<number, number> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        map[d] = 0;
      }
      data?.forEach(({ date, daily_spending }) => {
        const day = new Date(date).getDate();
        map[day] = daily_spending;
      });
      setDailySpendingByDate(map);
    })();
  }, [session, supabase, currentYear, daysInMonth]);

  const saveRates = async () => {
    if (!session) return;
    setSaving(true);
    const ue = session.user.email;
    const p: any = { user_name: ue };
    Object.entries(rates).forEach(([mStr, r]) => {
      const i = +mStr;
      p[
        [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ][i - 1] + "_rate"
      ] = r;
    });
    await supabase.from("budgets").upsert(p, { onConflict: "user_name" });
    setSaving(false);
    setIsEditing(false);
  };

  if (!session || loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );

  return (
    <>
      <Head>
        <title>Budżet – Dzisiaj</title>
      </Head>
      <Layout>
        <h2 className="mb-2 text-xl font-semibold">Statystyki</h2>
        <h3 className="font-bold mb-2">
          Budżet roczny
          {isEditing ? (
            <>
              <button
                onClick={saveRates}
                disabled={saving}
                className="ml-2 p-2 bg-green-100 rounded-lg hover:bg-green-200"
                title="zapisz"
              >
                {saving ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="ml-2 p-2 bg-red-100 rounded-lg hover:bg-red-200"
                title="zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="edytuj"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </h3>
        {/* First table */}
        <div className="mb-4 bg-card p-4 rounded-xl shadow">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-1.5 py-1">Miesiąc</th>
                <th className="border px-1.5 py-1">Suma</th>
                <th className="border px-1.5 py-1">Stawka</th>
                <th className="border px-1.5 py-1">Godz.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ month, monthName, sum, rate, hours }) => (
                <tr key={month}>
                  <td className="border px-1.5 py-1">{monthName}</td>
                  <td className="border px-1.5 py-1">{sum.toFixed(2)}</td>
                  <td className="border px-1.5 py-1">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setRates((prev) => ({ ...prev, [month]: v }));
                        }}
                        className="w-16 p-1 border rounded"
                        placeholder="5.00"
                      />
                    ) : (
                      rate.toFixed(2)
                    )}
                  </td>
                  <td className="border px-1.5 py-1">{hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Second table */}
        <h3 className="font-bold mb-2">Wydatki bieżące</h3>
        <div className="bg-card mb-4 p-4 rounded-xl shadow">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-1.5 py-1">Miesiąc</th>
                <th className="border px-1.5 py-1">Bieżące</th>
                <th className="border px-1.5 py-1">Pozostało</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(budgets).map(([mStr, budget]) => {
                const m = +mStr;
                const spent = monthlySpending[m] || 0;
                const rem = budget - spent;
                return (
                  <tr key={m}>
                    <td className="border px-1.5 py-1">{MONTH_NAMES[m - 1]}</td>
                    <td className="border px-1.5 py-1">{budget.toFixed(2)}</td>
                    <td className="border px-1.5 py-1">{rem.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="font-bold mb-2">
          Wydatki dzienne ({MONTH_NAMES[currentMonth - 1]})
        </h3>
        <div className="bg-card p-4 rounded-xl shadow mb-8">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="border px-1.5 py-1">Dzień</th>
                <th className="border px-1.5 py-1">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => (
                  <tr key={day}>
                    <td className="border px-1.5 py-1">{day}</td>
                    <td className="border px-1.5 py-1">
                      {(dailySpendingByDate[day] ?? 0).toFixed(2)}
                    </td>
                  </tr>
                )
              )}
              <tr className="font-semibold">
                <td className="border px-1.5 py-1">Suma</td>
                <td className="border px-1.5 py-1">
                  {Object.values(dailySpendingByDate)
                    .reduce((acc, val) => acc + val, 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Layout>
    </>
  );
}

BudgetPage.auth = true;
