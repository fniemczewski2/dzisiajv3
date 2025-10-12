// pages/bills.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, ChartColumnBig } from "lucide-react";
import { useBills } from "../hooks/useBills";
import { BillList } from "../components/bills/BillList";
import { BillListGrouped } from "../components/bills/BillListGrouped";
import { Bill } from "../types";
import { useRouter } from "next/router";
import { DailySpendingForm } from "../components/bills/DailySpendingForm";
import { BillForm } from "../components/bills/BillForm";

export default function BillsPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { bills, budgetItems, loading, fetchBills } = useBills(userEmail);
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
            <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
            </div>
        )}
        {showForm && (
          <div className="mb-6">
            <BillForm
              userEmail={userEmail}
              onChange={() => {
                fetchBills();
                setShowForm(false);
              }}
              initial={editing}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
            <DailySpendingForm userEmail={userEmail}/>

        {Object.keys(bills).length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2 mt-6">Wpływy planowane</h3>
            <BillList
              bills={bills}
              onEdit={openEdit}
              onDelete={(id) => {
                handleDelete(id);
                fetchBills();
              }}
            />
          </>
        )}
        {budgetItems.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2 mt-6">Wydatki planowane</h3>
            <BillListGrouped
              bills={budgetItems}
              onEdit={openEdit}
              onDelete={handleDelete}
              onMarkDone={async (id) => {
                await supabase.from("bills").update({ done: true }).eq("id", id);
                fetchBills();
              }}
            />
          </>
        )}
      </Layout>
    </>
  );
}
BillsPage.auth = true;
