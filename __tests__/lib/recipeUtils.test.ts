// __tests__/lib/recipeUtils.test.ts

import { describe, it, expect } from "vitest";
import {
  collectProducts,
  filterRecipes,
  hasProduct,
  isRecipeValid,
  normalizeProducts,
  normalizeRecipe,
  sortRecipes,
} from "@/lib/recipeUtils";
import { RECIPE_CATEGORIES, isRecipeCategory, type Recipe } from "@/types/recipes";

const recipe = (over: Partial<Recipe>): Recipe => ({
  id: over.id ?? Math.random().toString(36),
  name: "Przepis",
  category: "deser",
  products: [],
  description: "",
  user_id: "u1",
  ...over,
});

describe("normalizeProducts", () => {
  it("trims, collapses whitespace and removes case-insensitive duplicates", () => {
    expect(normalizeProducts(["  Mąka ", "mąka", "MĄKA", "jajka  kurze", "", "   "])).toEqual(["Mąka", "jajka kurze"]);
  });
});

describe("hasProduct", () => {
  it("matches regardless of case and surrounding spaces", () => {
    expect(hasProduct(["Mleko"], " mleko ")).toBe(true);
    expect(hasProduct(["Mleko"], "masło")).toBe(false);
    expect(hasProduct(undefined, "mleko")).toBe(false);
  });
});

describe("collectProducts", () => {
  it("merges the dictionary with ingredients used in recipes and sorts in Polish order", () => {
    const result = collectProducts(["cukier"], [recipe({ products: ["Śmietana", "cukier", "ser"] })]);
    expect(result).toEqual(["cukier", "ser", "Śmietana"]);
  });

  it("works when the products table is empty (the historical bug)", () => {
    expect(collectProducts([], [recipe({ products: ["jajka"] })])).toEqual(["jajka"]);
  });
});

describe("isRecipeValid / normalizeRecipe", () => {
  it("requires a name of at least 2 characters and one ingredient", () => {
    expect(isRecipeValid({ name: "A", products: ["x"] })).toBe(false);
    expect(isRecipeValid({ name: "Zupa", products: ["  "] })).toBe(false);
    expect(isRecipeValid({ name: "Zupa", products: ["woda"] })).toBe(true);
  });

  it("normalizes all fields before saving", () => {
    expect(
      normalizeRecipe({ name: "  Barszcz ", category: "zupa", products: ["buraki", "Buraki"], description: " opis " })
    ).toEqual({ name: "Barszcz", category: "zupa", products: ["buraki"], description: "opis" });
  });
});

describe("sortRecipes", () => {
  const list = [
    recipe({ id: "1", name: "Żurek", category: "zupa", created_at: "2026-01-01" }),
    recipe({ id: "2", name: "Adwokat", category: "deser", created_at: "2026-03-01" }),
    recipe({ id: "3", name: "Barszcz", category: "zupa", created_at: "2026-02-01" }),
  ];

  it("sorts by category, then name (default)", () => {
    expect(sortRecipes(list, undefined).map((r) => r.id)).toEqual(["2", "3", "1"]);
  });
  it("sorts alphabetically with Polish collation", () => {
    expect(sortRecipes(list, "alphabetical").map((r) => r.id)).toEqual(["2", "3", "1"]);
  });
  it("sorts newest first", () => {
    // 2026-03 (2), 2026-02 (3), 2026-01 (1)
    expect(sortRecipes(list, "created_desc").map((r) => r.id)).toEqual(["2", "3", "1"]);
  });
  it("does not mutate the input", () => {
    const copy = [...list];
    sortRecipes(list, "alphabetical");
    expect(list).toEqual(copy);
  });
});

describe("filterRecipes", () => {
  const list = [
    recipe({ id: "a", name: "Naleśniki", products: ["mąka", "jajka", "mleko"] }),
    recipe({ id: "b", name: "Jajecznica", products: ["jajka", "masło"], description: "na maśle" }),
  ];

  it("searches by ingredient too, not only name/description", () => {
    expect(filterRecipes(list, "mleko", []).map((r) => r.id)).toEqual(["a"]);
  });
  it("requires all selected ingredients", () => {
    expect(filterRecipes(list, "", ["jajka"]).map((r) => r.id)).toEqual(["a", "b"]);
    expect(filterRecipes(list, "", ["jajka", "masło"]).map((r) => r.id)).toEqual(["b"]);
  });
  it("matches selected ingredients case-insensitively", () => {
    expect(filterRecipes(list, "", ["MĄKA"]).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("RECIPE_CATEGORIES", () => {
  it("contains Polish labels expected by the DB enum", () => {
    expect(RECIPE_CATEGORIES).toContain("śniadanie");
    expect(isRecipeCategory("danie główne")).toBe(true);
    expect(isRecipeCategory("sniadanie")).toBe(false);
  });
});
