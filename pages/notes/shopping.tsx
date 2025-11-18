import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, ShoppingCart } from "lucide-react";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import { ShoppingList } from "../../types";
import ShoppingForm from "../../components/shopping/ShoppingForm";
import ShoppingListView from "../../components/shopping/ShoppingListView";
import LoadingState from "../../components/LoadingState";

export default function ShoppingPage() {
  const { loading, fetchShoppingLists } = useShoppingLists();

  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setShowForm(true);
  };

  return (
    <>
      <Head>
        <title>Zakupy – Dzisiaj</title>
        <meta name="description" content="Twórz i zarządzaj listami zakupów." />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/shopping" />
        <meta property="og:title" content="Zakupy – Dzisiaj" />
        <meta
          property="og:description"
          content="Twórz i zarządzaj listami zakupów."
        />
      </Head>

      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Zakupy
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

        {(loading) && (
            <LoadingState />
        )} 
        {showForm && (
          <div className="mb-6">
            <ShoppingForm
              onChange={() => {
                fetchShoppingLists();
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
          <ShoppingListView/>
      </Layout>
    </>
  );
}

ShoppingPage.auth = true;
