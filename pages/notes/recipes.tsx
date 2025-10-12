// pages/recipes.tsx
import dynamic from "next/dynamic";
import Head from "next/head";
import { useSession } from "@supabase/auth-helpers-react";
import Layout from "../../components/Layout";
import type { Recipe } from "../../types";
import { PlusCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";

const RecipeForm = dynamic(() => import("../../components/recipes/RecipeForm"), { ssr: false });
const RecipesList = dynamic(() => import("../../components/recipes/RecipesList"), { ssr: false });

export default function RecipesPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";

  const [editing, setEditing] = useState<Recipe | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = () => setRefreshTick((t) => t + 1);

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
          <RecipesList key={refreshTick} userEmail={userEmail} />
        </section>
      </Layout>
    </>
  );
}
