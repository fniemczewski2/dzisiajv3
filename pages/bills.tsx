// pages/bills.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon } from "lucide-react";
import { useBills } from "../hooks/useBills";
import { BillForm } from "../components/BillForm";
import { BillList } from "../components/BillList";
import { Bill } from "../types";

export default function BillsPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { bills, loading, fetchBills } = useBills(userEmail);

  const [editing, setEditing] = useState<Bill | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  const openNew = () => {
    setEditing(undefined);
    setShowForm(true);
  };
  const openEdit = (b: Bill) => {
    setEditing(b);
    setShowForm(true);
  };
  const closeForm = () => setShowForm(false);

  return (
    <>
      <Head>
        <title>Rachunki – Dzisiaj v3</title>
        <meta
          name="description"
          content="Zarządzaj rachunkami: dodawaj, edytuj, usuwaj."
        />
        <link rel="canonical" href="https://yourdomain.com/bills" />
        <meta property="og:title" content="Rachunki – Dzisiaj v3" />
        <meta
          property="og:description"
          content="Zarządzaj rachunkami: dodawaj, edytuj, usuwaj."
        />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Rachunki</h2>
          {!showForm && (
            <button
              onClick={openNew}
              className="px-4 py-2 flex items-center bg-primary text-white rounded-xl"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>

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

        <BillList
          bills={bills}
          onEdit={openEdit}
          onDelete={(id) => {
            if (confirm("Usuń rachunek?")) fetchBills();
          }}
        />
      </Layout>
    </>
  );
}
BillsPage.auth = true;
