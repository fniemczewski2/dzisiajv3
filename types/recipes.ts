
export type RecipeCategory =
  | "śniadanie"
  | "zupa"
  | "danie główne"
  | "przystawka"
  | "sałatka"
  | "deser";

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