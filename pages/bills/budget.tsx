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
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch sums and rates
  useEffect(() => {
    if (!session) return;
    (async () => {
      const userEmail = session.user.email;
      const currentMonth = new Date().getMonth() + 1;
      const localSums: Record<number, number> = {};
      const localRates: Record<number, number> = {};
      for (let m = currentMonth; m <= 12; m++) {
        localSums[m] = 0;
        localRates[m] = 0;
      }
      // fetch bills
      const { data: bills } = await supabase
        .from("bills")
        .select("amount, date")
        .eq("user_name", userEmail)
        .eq("include_in_budget", true);
      bills?.forEach(({ amount, date }) => {
        const m = new Date(date).getMonth() + 1;
        if (localSums[m] !== undefined) localSums[m] += amount;
      });
      // fetch rates
      const { data: budgetData } = await supabase
        .from("budgets")
        .select(
          "jan_rate,feb_rate,mar_rate,apr_rate,may_rate,jun_rate,jul_rate,aug_rate,sep_rate,oct_rate,nov_rate,dec_rate"
        )
        .eq("user_name", userEmail)
        .maybeSingle();
      // if no record exists, create default row with all rates = default 0
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
      setLoading(false);
    })();
  }, [session, supabase]);

  // Compute rows
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
    // prepare payload
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
        <h2 className="mb-2 text-xl font-semibold">
          Budżet miesięczny{" "}
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
        </h2>
        <div className="flex items-center mb-4 space-y-4 bg-card p-2 sm:p-4 rounded-xl shadow">
          <table className="w-full table-auto border-collapse rounded-sm">
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
                        className="w-12 p-1 border rounded"
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
      </Layout>
    </>
  );
}

BudgetPage.auth = true;
