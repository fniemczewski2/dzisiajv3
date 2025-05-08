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

  const [sums, setSums] = useState<Record<number, number>>({});
  const [rates, setRates] = useState<Record<number, number>>({});
  const [budgets, setBudgets] = useState<Record<number, number>>({});
  const [excluded, setExcluded] = useState<Record<number, number>>({});
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch sums, rates, budgets, and excluded
  useEffect(() => {
    if (!session) return;
    (async () => {
      const userEmail = session.user.email;
      const currentMonth = new Date().getMonth() + 1;
      const localSums: Record<number, number> = {};
      const localRates: Record<number, number> = {};
      const localBudgets: Record<number, number> = {};
      const localExcluded: Record<number, number> = {};

      for (let m = currentMonth; m <= 12; m++) {
        localSums[m] = 0;
        localRates[m] = 0;
        localBudgets[m] = 0;
        localExcluded[m] = 0;
      }

      // Sum "Bieżące" bills to budgets
      const { data: bieżące } = await supabase
        .from("bills")
        .select("amount, date")
        .eq("user_name", userEmail)
        .eq("include_in_budget", true)
        .eq("description", "Bieżące");
      bieżące?.forEach(({ amount, date }) => {
        const m = new Date(date).getMonth() + 1;
        if (localBudgets[m] !== undefined) localBudgets[m] += amount;
      });

      // Sum included bills
      const { data: bills } = await supabase
        .from("bills")
        .select("amount, date")
        .eq("user_name", userEmail)
        .eq("include_in_budget", true);
      bills?.forEach(({ amount, date }) => {
        const m = new Date(date).getMonth() + 1;
        if (localSums[m] !== undefined) localSums[m] += amount;
      });

      // Sum excluded bills
      const { data: excludedBills } = await supabase
        .from("bills")
        .select("amount, date")
        .eq("user_name", userEmail)
        .eq("include_in_budget", false);
      excludedBills?.forEach(({ amount, date }) => {
        const m = new Date(date).getMonth() + 1;
        if (localExcluded[m] !== undefined) localExcluded[m] += amount;
      });

      // Fetch rate settings
      const { data: budgetData } = await supabase
        .from("budgets")
        .select(
          "jan_rate,feb_rate,mar_rate,apr_rate,may_rate,jun_rate,jul_rate,aug_rate,sep_rate,oct_rate,nov_rate,dec_rate"
        )
        .eq("user_name", userEmail)
        .maybeSingle();
      if (!budgetData) {
        await supabase.from("budgets").insert({ user_name: userEmail });
      }
      if (budgetData) {
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
          localRates[i] = (budgetData as any)[key] ?? 0;
        }
      }

      setSums(localSums);
      setRates(localRates);
      setBudgets(localBudgets);
      setExcluded(localExcluded);
      setLoading(false);
    })();
  }, [session, supabase]);

  // Compute rows for first table
  useEffect(() => {
    const result: BudgetRow[] = Object.entries(sums).map(([mStr, sum]) => {
      const month = parseInt(mStr, 10);
      const rate = rates[month] ?? 0;
      const hours = rate > 0 ? Math.round(sum / rate) : 0;
      return { month, monthName: MONTH_NAMES[month - 1], sum, rate, hours };
    });
    setRows(result);
  }, [sums, rates]);

  const handleRateChange = (month: number, value: number) => {
    setRates((prev) => ({ ...prev, [month]: value }));
  };

  const saveRates = async () => {
    if (!session) return;
    setSaving(true);
    const userEmail = session.user.email;
    const payload: any = { user_name: userEmail };
    Object.entries(rates).forEach(([mStr, rate]) => {
      const i = parseInt(mStr, 10);
      const col =
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
      payload[col] = rate;
    });
    const { error } = await supabase
      .from("budgets")
      .upsert(payload, { onConflict: "user_name" });
    if (error) console.error("Upsert budgets error:", error.message);
    setSaving(false);
    setIsEditing(false);
  };

  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Budżet – Dzisiaj</title>
      </Head>
      <Layout>
        <h2 className="mb-2 text-xl font-semibold">Statystyki</h2>
        <h3 className="font-bold mb-2">
          Budżet roczny&nbsp;
          {isEditing ? (
            <>
              <button
                onClick={saveRates}
                disabled={saving}
                className="ml-2 p-2 bg-green-100 rounded-xl hover:bg-green-200"
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
                className="ml-2 p-2 bg-red-100 rounded-xl hover:bg-red-200"
                title="zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 p-2 bg-gray-100 rounded-xl hover:bg-gray-200"
              title="edytuj"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </h3>

        {/* First table: sums, rates, hours */}
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
                        onChange={(e) =>
                          handleRateChange(
                            month,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-16 p-1 border rounded"
                        title="stawka"
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

        <h3 className="font-bold mb-2">Wydatki bieżące</h3>
        <div className="bg-card p-4 rounded-xl shadow">
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
                const month = parseInt(mStr, 10);
                const remaining = budget - (excluded[month] ?? 0);
                return (
                  <tr key={month}>
                    <td className="border px-1.5 py-1">
                      {MONTH_NAMES[month - 1]}
                    </td>
                    <td className="border px-1.5 py-1">{budget.toFixed(2)}</td>
                    <td className="border px-1.5 py-1">
                      {remaining.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Layout>
    </>
  );
}

BudgetPage.auth = true;
