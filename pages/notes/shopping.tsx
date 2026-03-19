import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import ShoppingForm from "../../components/shopping/ShoppingForm";
import ShoppingListView from "../../components/shopping/ShoppingListView";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";

export default function ShoppingPage() {

  const { lists, loading, addShoppingList, editShoppingList, deleteShoppingList } = useShoppingLists();
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setShowForm(true);
  };

    if (loading) {
      return (
          <LoadingState fullScreen/>
      );
    }
  

  return (
    <>
      <Head>
        <title>Zakupy – Dzisiaj</title>
        <meta name="description" content="Twórz i zarządzaj listami zakupów." />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/shopping" />
        <meta property="og:title" content="Zakupy – Dzisiaj" />
        <meta property="og:description" content="Twórz i zarządzaj listami zakupów." />
      </Head>

      <Layout>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">
            Listy zakupów
          </h2>
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {showForm && (
          <div className="mb-6">
            <ShoppingForm
              lists={lists}
              loading={loading}
              addShoppingList={addShoppingList}
              onChange={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
        
        <ShoppingListView 
          lists={lists}
          editShoppingList={editShoppingList}
          deleteShoppingList={deleteShoppingList}
        />
      </Layout>
    </>
  );
}

ShoppingPage.auth = true;