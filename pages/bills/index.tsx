import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Calculator, ChartColumnBig } from "lucide-react";
import { useBills } from "../../hooks/useBills";
import BillListGrouped from "../../components/bills/BillListGrouped";
import { useRouter } from "next/router";
import DailySpendingForm from "../../components/widgets/DailySpendingForm";
import BillForm from "../../components/bills/BillForm";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";
import { useQuickAction } from "../../hooks/useQuickAction";

export default function BillsPage() {
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
        {/* NAGŁÓWEK */}
        <div className="flex justify-between items-center mb-6 gap-2">
          <div className="flex flex-row items-center gap-2 sm:gap-4">
            <h2 className="text-2xl font-bold text-text">
              Finanse
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => router.push("/bills/budget")}
                title="Budżet"
                className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
              >
                <ChartColumnBig className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => router.push("/bills/calculator")}
                title="Kalkulator Podziału"
                className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
              >
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {loading && <LoadingState />}

        {showForm && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4">
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
            <h3 className="text-xl font-bold text-text mb-4 mt-8 pb-2 border-b border-gray-100 dark:border-gray-800">
              Wpływy
            </h3>
            <BillListGrouped bills={incomeItems} onBillsChange={fetchBills} />
          </>
        )}
        
        {expenseItems.length > 0 && (
          <>
            <h3 className="text-xl font-bold text-text mb-4 mt-8 pb-2 border-b border-gray-100 dark:border-gray-800">
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