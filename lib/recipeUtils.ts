// lib/recipeUtils.ts

import type { NewRecipe, Recipe } from "@/types/recipes";

export const RECIPE_NAME_MIN_LENGTH = 2;
export const RECIPE_NAME_MAX_LENGTH = 200;
export const RECIPE_PRODUCT_MAX_LENGTH = 80;
export const RECIPE_PRODUCTS_MAX = 100;
export const RECIPE_DESCRIPTION_MAX_LENGTH = 10000;

const collator = new Intl.Collator("pl", { sensitivity: "base" });

/** Klucz porównania składników: bez wielkości liter i zbędnych spacji. */
export function productKey(raw: string): string {
  return raw.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("pl");
}

/** Przycina, skraca zbyt długie i usuwa duplikaty (bez względu na wielkość liter). */
export function normalizeProducts(products: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of products) {
    const value = raw.trim().replaceAll(/\s+/g, " ").slice(0, RECIPE_PRODUCT_MAX_LENGTH);
    const key = productKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= RECIPE_PRODUCTS_MAX) break;
  }
  return out;
}

export function hasProduct(products: readonly string[] | null | undefined, candidate: string): boolean {
  const key = productKey(candidate);
  return (products ?? []).some((p) => productKey(p) === key);
}

/** Łączy słownik `products` z faktycznymi składnikami przepisów, posortowane po polsku. */
export function collectProducts(dictionary: readonly string[], recipes: readonly Pick<Recipe, "products">[]): string[] {
  const all = normalizeProducts([...dictionary, ...recipes.flatMap((r) => r.products ?? [])]);
  return all.sort(collator.compare);
}

export function normalizeRecipe<T extends NewRecipe>(recipe: T): T {
  return {
    ...recipe,
    name: recipe.name.trim().slice(0, RECIPE_NAME_MAX_LENGTH),
    products: normalizeProducts(recipe.products ?? []),
    description: (recipe.description ?? "").trim().slice(0, RECIPE_DESCRIPTION_MAX_LENGTH),
  };
}

export function isRecipeValid(recipe: Pick<NewRecipe, "name" | "products">): boolean {
  return recipe.name.trim().length >= RECIPE_NAME_MIN_LENGTH && normalizeProducts(recipe.products ?? []).length > 0;
}

export type RecipeSort = "category" | "alphabetical" | "created_desc";

export function sortRecipes(recipes: readonly Recipe[], sort: string | undefined): Recipe[] {
  const byName = (a: Recipe, b: Recipe) => collator.compare(a.name ?? "", b.name ?? "");
  const byDate = (a: Recipe, b: Recipe) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  const list = [...recipes];

  switch (sort) {
    case "alphabetical":
      return list.sort(byName);
    case "created_desc":
      return list.sort(byDate);
    default:
      return list.sort((a, b) => {
        const aEmpty = !a.category?.trim();
        const bEmpty = !b.category?.trim();
        if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
        return collator.compare(a.category ?? "", b.category ?? "") || byName(a, b);
      });
  }
}

/** Filtr: tekst dopasowuje nazwę, opis lub składnik; wybrane składniki muszą wystąpić wszystkie. */
export function filterRecipes(recipes: readonly Recipe[], query: string, requiredProducts: readonly string[]): Recipe[] {
  const q = query.trim().toLocaleLowerCase("pl");
  return recipes.filter((r) => {
    const matchesText =
      !q ||
      r.name.toLocaleLowerCase("pl").includes(q) ||
      (r.description ?? "").toLocaleLowerCase("pl").includes(q) ||
      (r.products ?? []).some((p) => p.toLocaleLowerCase("pl").includes(q));
    const matchesProducts = requiredProducts.every((p) => hasProduct(r.products, p));
    return matchesText && matchesProducts;
  });
}
