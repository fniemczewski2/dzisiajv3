// pages/recipes.tsx
import dynamic from "next/dynamic";
import Head from "next/head";
import { useSession } from "@supabase/auth-helpers-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react"; // ⬅️ DODANE
import Layout from "../../components/Layout";
import type { Recipe } from "../../types";
import { PlusCircleIcon } from "lucide-react";
import { useState, useCallback } from "react";

const RecipeForm = dynamic(() => import("../../components/recipes/RecipeForm"), { ssr: false });
const RecipesList = dynamic(() => import("../../components/recipes/RecipesList"), { ssr: false });

export default function RecipesPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const supabase = useSupabaseClient(); 

  const [editing, setEditing] = useState<Recipe | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const openNew = () => {
    setEditing(undefined);
    setShowForm(true);
  };

  const openEdit = (r: Recipe) => {
    setEditing(r);
    setShowForm(true);
  };

  const closeForm = () => {
    setEditing(undefined);
    setShowForm(false);
  };

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = window.confirm("Na pewno usunąć ten przepis?");
      if (!ok) return;
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) {
        console.error(error);
        alert("Nie udało się usunąć przepisu.");
        return;
      }
      refresh(); // przeładowanie listy
    },
    [supabase, refresh]
  );

  return (
    <>
      <Head>
        <title>Przepisy</title>
      </Head>
      <Layout>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Przepisy</h2>
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

        {showForm && (
          <section className="mb-6">
            <RecipeForm
              userEmail={userEmail}
              initial={editing}
              onCancel={closeForm}
              onChange={() => {
                refresh();
                closeForm();
              }}
            />
          </section>
        )}

        <section>
          <RecipesList
            key={refreshTick}
            userEmail={userEmail}
            onEdit={openEdit}        
            onDelete={handleDelete}  
          />
        </section>
      </Layout>
    </>
  );
}
