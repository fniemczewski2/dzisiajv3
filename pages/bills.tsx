// pages/bills.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { PlusCircleIcon, ChartColumnBig } from "lucide-react";
import { useBills } from "../hooks/useBills";
import BillList from "../components/bills/BillList";
import BillListGrouped  from "../components/bills/BillListGrouped";
import { Bill } from "../types";
import { useRouter } from "next/router";
import DailySpendingForm  from "../components/bills/DailySpendingForm";
import BillForm from "../components/bills/BillForm";
import LoadingState from "../components/LoadingState";

export default function BillsPage() {
  const session = useSession();
  const { bills, budgetItems, loading, fetchBills } = useBills();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [editing, setEditing] = useState<Bill | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setEditing(undefined);
    setShowForm(true);
  };
  const openEdit = (b: Bill) => {
    setEditing(b);
    setShowForm(true);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć rachunek?")) return;
    await supabase.from("bills").delete().eq("id", id);
    fetchBills();
  };

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
            Rachunki
            <button
              onClick={() => router.push("/bills/budget")}
              title="Budżet"
              className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <ChartColumnBig className="w-5 h-5" />
            </button>
          </h2>
          
          {!showForm && (
            <button
              onClick={openNew}
              className="px-3 py-1.5 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        {(!session || loading) && (
              <LoadingState />
        )}
        {showForm && (
          <div className="mb-6">
            <BillForm
              onChange={() => {
                fetchBills();
                setShowForm(false);
              }}
              initial={editing}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
            <DailySpendingForm/>

        {Object.keys(bills).length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2 mt-6">Wpływy planowane</h3>
            <BillList
              bills={bills}
            />
          </>
        )}
        {budgetItems.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2 mt-6">Wydatki planowane</h3>
            <BillListGrouped
              bills={budgetItems}
            />
          </>
        )}
      </Layout>
    </>
  );
}
BillsPage.auth = true;
