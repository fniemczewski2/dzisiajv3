import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AddButton } from "@/components/ui/CommonButtons";
import { useRecipes } from "@/hooks/db/useRecipes";
import Seo from "@/components/ui/SEO";

const RecipeForm = dynamic(() => import("@/components/recipes/RecipeForm"), { ssr: false });
const RecipesList = dynamic(() => import("@/components/recipes/RecipesList"), { ssr: false });

export default function RecipesPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshToken((t) => t + 1), []);
  const { fetching } = useRecipes();
  
  return (
    <>
      <Seo
        title="Przepisy | Dzisiaj.Fun"
        description="Zbieraj swoje ulubione przepisy kulinarne w jednej, prostej w użyciu książce kucharskiej."
        canonical="https://dzisiaj.fun/notes/recipes"
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
          {fetching
            ? <SkeletonList count={4} variant="card" />
            : <RecipesList refreshToken={refreshToken} />
          }
        </section>
    </>
    );
}
