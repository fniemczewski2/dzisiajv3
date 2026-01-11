import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import ShoppingForm from "../../components/shopping/ShoppingForm";
import ShoppingListView from "../../components/shopping/ShoppingListView";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";

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
          {!showForm && <AddButton onClick={openNew} type="button" />}
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
