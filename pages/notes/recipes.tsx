// pages/recipes.tsx
import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../../components/Layout";
import { PlusCircleIcon } from "lucide-react";
import { useState, useCallback } from "react";

const RecipeForm = dynamic(() => import("../../components/recipes/RecipeForm"), { ssr: false });
const RecipesList = dynamic(() => import("../../components/recipes/RecipesList"), { ssr: false });

export default function RecipesPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

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
              onClick={() => setShowForm(true)}
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
              onCancel={() => setShowForm(false)}
              onChange={() => {
                refresh();
                setShowForm(false);
              }}
            />
          </section>
        )}

        <section>
          <RecipesList
            key={refreshTick}       
          />
        </section>
      </Layout>
    </>
  );
}
RecipesPage.auth = true;
