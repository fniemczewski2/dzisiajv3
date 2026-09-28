// types/recipes.ts

/**
 * Jedyne źródło prawdy dla kategorii przepisów. Wartości muszą być zgodne
 * z enumem `public.recipe_category` w bazie (patrz migracja
 * 20260928000000_fix_recipe_category_enum.sql).
 */
export const RECIPE_CATEGORIES = [
  "śniadanie",
  "zupa",
  "danie główne",
  "przystawka",
  "sałatka",
  "deser",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const DEFAULT_RECIPE_CATEGORY: RecipeCategory = "śniadanie";

export function isRecipeCategory(value: unknown): value is RecipeCategory {
  return typeof value === "string" && (RECIPE_CATEGORIES as readonly string[]).includes(value);
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  products: string[];
  description: string;
  user_id: string;
  created_at?: string;
}

export type NewRecipe = {
  name: string;
  category: RecipeCategory;
  products: string[];
  description: string;
};

export interface Product {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
}

export type RecipeInsert = Omit<Recipe, "id" | "created_at">;
