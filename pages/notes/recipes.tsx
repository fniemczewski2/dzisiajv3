// pages/notes/recipes.tsx

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AddButton } from "@/components/ui/CommonButtons";
import { useRecipes } from "@/hooks/db/useRecipes";
import { useQuickAction } from "@/hooks/useQuickAction";
import type { NewRecipe } from "@/types/recipes";
import Seo from "@/components/ui/SEO";

const RecipeForm = dynamic(() => import("@/components/recipes/RecipeForm"), { ssr: false });
const RecipesList = dynamic(() => import("@/components/recipes/RecipesList"), { ssr: false });

export default function RecipesPage() {
  const [showForm, setShowForm] = useState(false);
  // Jedna instancja hooka dla całej strony – wcześniej strona, formularz i lista
  // miały każda własny stan, więc dane pobierały się trzykrotnie, a nowy przepis
  // pojawiał się na liście dopiero po ponownym pobraniu.
  const { recipes, products, loading, fetching, addRecipe, editRecipe, deleteRecipe } = useRecipes();

  useQuickAction({ onActionAdd: () => setShowForm(true) });

  const handleAdd = useCallback(
    async (recipe: NewRecipe): Promise<boolean> => {
      const created = await addRecipe(recipe);
      if (created) setShowForm(false);
      return Boolean(created);
    },
    [addRecipe]
  );

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
            products={products}
            loading={loading}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            autoFocus
          />
        </section>
      )}

      <section>
        {fetching && recipes.length === 0 ? (
          <SkeletonList count={4} variant="card" />
        ) : (
          <RecipesList
            recipes={recipes}
            products={products}
            loading={loading}
            onEdit={editRecipe}
            onDelete={deleteRecipe}
          />
        )}
      </section>
    </>
  );
}
