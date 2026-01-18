// pages/bills.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useSession } from "@supabase/auth-helpers-react";
import { ChartColumnBig } from "lucide-react";
import { useBills } from "../../hooks/useBills";
import BillListGrouped from "../../components/bills/BillListGrouped";
import { useRouter } from "next/router";
import DailySpendingForm from "../../components/bills/DailySpendingForm";
import BillForm from "../../components/bills/BillForm";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";
import { useQuickAction } from "../../hooks/useQuickAction";

export default function BillsPage() {
  const session = useSession();
  const { incomeItems, expenseItems, loading, fetchBills } = useBills();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setShowForm(true);
  };

  useQuickAction({
    onActionAdd: () => setShowForm(true),
  });

  return (
    <>
      <Head>
        <title>Rachunki - Dzisiaj</title>
        <meta
          name="description"
          content="Zarządzaj rachunkami: dodawaj, edytuj, usuwaj."
        />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/bills" />
        <meta property="og:title" content="Rachunki - Dzisiaj" />
        <meta
          property="og:description"
          content="Zarządzaj rachunkami: dodawaj, edytuj, usuwaj."
        />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Finanse
            <button
              onClick={() => router.push("/bills/budget")}
              title="Budżet"
              className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <ChartColumnBig className="w-5 h-5" />
            </button>
          </h2>

          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>
        {(!session || loading) && <LoadingState />}
        {showForm && (
          <div className="mb-6">
            <BillForm
              onChange={() => {
                fetchBills();
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
        <DailySpendingForm />

        {Object.keys(incomeItems).length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2 mt-6">
              Wpływy
            </h3>
            <BillListGrouped bills={incomeItems} onBillsChange={fetchBills} />
          </>
        )}
        {expenseItems.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2 mt-6">
              Wydatki
            </h3>
            <BillListGrouped bills={expenseItems} onBillsChange={fetchBills} />
          </>
        )}
      </Layout>
    </>
  );
}
BillsPage.auth = true;