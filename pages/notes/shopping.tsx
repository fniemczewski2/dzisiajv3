import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, ShoppingCart } from "lucide-react";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import { ShoppingList } from "../../types";
import ShoppingForm from "../../components/shopping/ShoppingForm";
import ShoppingListView from "../../components/shopping/ShoppingListView";

export default function ShoppingPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { lists, loading, fetchLists, updateList, deleteList } =
    useShoppingLists(userEmail);
  const supabase = useSupabaseClient();

  const [editing, setEditing] = useState<ShoppingList | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setEditing(undefined);
    setShowForm(true);
  };
  const openEdit = (l: ShoppingList) => {
    setEditing(l);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć listę?")) return;
    await supabase.from("shopping_lists").delete().eq("id", id);
    fetchLists();
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

        {(!session || loading) && (
          <div className="min-h-[200px] flex items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
          </div>
        )} 
        {showForm && (
          <div className="mb-6">
            <ShoppingForm
              userEmail={userEmail}
              onChange={() => {
                fetchLists();
                setShowForm(false);
              }}
              initial={editing}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
          <ShoppingListView
            userEmail={userEmail}
            lists={lists}
            onEdit={openEdit}
            onDelete={(id) => {
              handleDelete(id);
              fetchLists();
            }}
            onUpdate={updateList}
          />
      </Layout>
    </>
  );
}

ShoppingPage.auth = true;
