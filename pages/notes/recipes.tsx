import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import { AddButton } from "../../components/CommonButtons";
import { useToast } from "../../providers/ToastProvider";
import { useRecipes } from "../../hooks/useRecipes";
import Seo from "../../components/SEO";

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
        toastId = toast.loading("Ładowanie przepisów...");
      }
  
      return () => {
        if (toastId && toast.dismiss) {
          toast.dismiss(toastId);
        }
      };
  }, [fetching, toast]);
  
  return (
    <>
      <Seo
        title="Przepisy - Dzisiaj v3"
        description="Zbieraj swoje ulubione przepisy kulinarne w jednej, prostej w użyciu książce kucharskiej."
        canonical="https://dzisiajv3.vercel.app/notes/recipes"
        keywords="przepisy kulinarne, gotowanie, książka kucharska, jedzenie"
      />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text">Przepisy</h2>
          {!showForm && <AddButton onClick={() => setShowForm(true)} />}
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
    </>
  );
}
