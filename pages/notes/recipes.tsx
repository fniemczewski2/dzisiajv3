import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useState, useCallback, useEffect } from "react";
import { AddButton } from "../../components/CommonButtons";
import { useToast } from "../../providers/ToastProvider";
import { useRecipes } from "../../hooks/useRecipes";

const RecipeForm = dynamic(() => import("../../components/recipes/RecipeForm"), { ssr: false });
const RecipesList = dynamic(() => import("../../components/recipes/RecipesList"), { ssr: false });

export default function RecipesPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshToken((t) => t + 1), []);
  const { toast } = useToast();
  const { fetching } = useRecipes();
  
  useEffect(() => {
      let toastId: string | undefined;
      
      if (fetching && toast.loading) {
        toastId = toast.loading("Ładowanie finansów...");
      }
  
      return () => {
        if (toastId && toast.dismiss) {
          toast.dismiss(toastId);
        }
      };
  }, [fetching, toast]);
  
  return (
    <>
      <Head><title>Przepisy – Dzisiaj</title></Head>
      <Layout>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text">Przepisy</h2>
          {!showForm && <AddButton onClick={() => setShowForm(true)} type="button" />}
        </div>

        {showForm && (
          <section className="mb-6">
            <RecipeForm
              onCancel={() => setShowForm(false)}
              onChange={() => {
                setShowForm(false);
                triggerRefresh();
              }}
            />
          </section>
        )}

        <section>
          <RecipesList refreshToken={refreshToken} />
        </section>
      </Layout>
    </>
  );
}
