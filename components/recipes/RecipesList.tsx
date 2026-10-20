// components/recipes/RecipesList.tsx

import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NewRecipe, Recipe } from "@/types/recipes";
import { filterRecipes } from "@/lib/recipeUtils";
import { EditButton, DeleteButton, ToggleChip } from "../ui/CommonButtons";
import SearchBar from "../ui/SearchBar";
import NoResultsState from "../ui/NoResultsState";
import RecipeForm from "./RecipeForm";

interface RecipesListProps {
  /** Przepisy już posortowane wg ustawień (sortuje hook useRecipes). */
  recipes: readonly Recipe[];
  products: readonly string[];
  loading?: boolean;
  onEdit: (recipe: Recipe) => Promise<Recipe | undefined>;
  onDelete: (id: string) => Promise<boolean>;
}

const isTemp = (id: string) => id.startsWith("temp-");

export default function RecipesList({
  recipes,
  products,
  loading = false,
  onEdit,
  onDelete,
}: Readonly<RecipesListProps>) {
  const [qText, setQText] = useState("");
  const [prodFilter, setProdFilter] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => filterRecipes(recipes, qText, prodFilter), [recipes, qText, prodFilter]);

  const recipeSuggestions = useMemo(
    () =>
      recipes
        .map((r) => r.name)
        .filter(Boolean)
        .slice(0, 20),
    [recipes]
  );

  const toggleProd = (p: string) =>
    setProdFilter((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleOpen = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const handleSaveEdit = async (original: Recipe, data: NewRecipe): Promise<boolean> => {
    const saved = await onEdit({ ...original, ...data });
    if (saved) setEditingId(null);
    return Boolean(saved);
  };

  const handleDelete = async (id: string) => {
    const deleted = await onDelete(id);
    if (deleted && openId === id) setOpenId(null);
  };

  const hasActiveFilters = qText.trim().length > 0 || prodFilter.length > 0;

  return (
    <div className="space-y-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full flex-1">
          <SearchBar
            value={qText}
            onChange={setQText}
            placeholder="Szukaj po nazwie, opisie lub składniku..."
            suggestions={recipeSuggestions}
            onSuggestionClick={setQText}
            className="w-full"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          disabled={products.length === 0}
          className="card flex h-10.5 shrink-0 items-center justify-center gap-2 px-4 py-2.5 font-bold text-text-secondary shadow-sm transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-35"
        >
          {showFilters ? "Ukryj filtry" : "Pokaż filtry"}
          {prodFilter.length > 0 && (
            <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-white">{prodFilter.length}</span>
          )}
        </button>
      </div>

      {showFilters && products.length > 0 && (
        <div className="card mx-auto max-w-2xl p-4 shadow-sm">
          <span className="mb-3 block text-xs font-bold text-text-muted">
            Pokaż przepisy zawierające wszystkie zaznaczone składniki:
          </span>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <ToggleChip key={p} label={p} active={prodFilter.includes(p)} onClick={() => toggleProd(p)} />
            ))}
          </div>
          {prodFilter.length > 0 && (
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-line bg-surface py-2 text-sm font-bold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
              onClick={() => setProdFilter([])}
            >
              Wyczyść filtry składników
            </button>
          )}
        </div>
      )}

      <ul className="mx-auto w-full max-w-2xl space-y-4">
        {filtered.map((r) => {
          const open = openId === r.id;

          if (editingId === r.id) {
            return (
              <li key={r.id} className="rounded-card border border-primary bg-card p-5 shadow-lg dark:border-primary">
                <RecipeForm
                  className="space-y-4"
                  products={products}
                  loading={loading}
                  initial={{
                    name: r.name,
                    category: r.category,
                    products: r.products ?? [],
                    description: r.description ?? "",
                  }}
                  onSubmit={(data) => handleSaveEdit(r, data)}
                  onCancel={() => setEditingId(null)}
                  focusNameOnOpen
                />
              </li>
            );
          }

          const panelId = `recipe-panel-${r.id}`;
          return (
            <li
              key={r.id}
              className="card group overflow-hidden shadow-sm transition-all duration-200 hover:border-primary"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => toggleOpen(r.id)}
                aria-expanded={open}
                aria-controls={panelId}
              >
                <div className="flex-1 pr-3">
                  <h3 className="text-lg leading-tight font-bold text-text">{r.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {r.category && (
                      <span className="inline-block rounded-lg border border-primary bg-info-soft px-2 py-0.5 text-xs font-semibold text-primary">
                        {r.category}
                      </span>
                    )}
                    {(r.products?.length ?? 0) > 0 && (
                      <span className="text-xs text-text-muted">
                        {r.products.length} {pluralizeIngredients(r.products.length)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-surface p-2 text-text-secondary" aria-hidden="true">
                  <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </span>
              </button>
              {open && (
                <div id={panelId} className="space-y-4 border-t border-line bg-card px-4 pt-1 pb-4">
                  {r.products && r.products.length > 0 && (
                    <div className="pt-3">
                      <span className="mb-2 block text-xs font-bold text-text-muted">Składniki:</span>
                      <ul className="flex flex-wrap gap-1.5">
                        {r.products.map((p) => (
                          <li key={p} className="card px-2 py-1 text-xs font-medium text-text">
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.description && (
                    <div>
                      <span className="mb-2 block text-xs font-bold text-text-muted">Przygotowanie:</span>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-text-secondary">{r.description}</p>
                    </div>
                  )}
                  <div className="mt-2 flex w-full justify-end gap-1.5 border-t border-line pt-4">
                    <EditButton onClick={() => setEditingId(r.id)} disabled={isTemp(r.id) || loading} />
                    <DeleteButton onClick={() => handleDelete(r.id)} disabled={isTemp(r.id) || loading} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && <NoResultsState text="przepisów" isSearch={hasActiveFilters} />}
      </ul>
    </div>
  );
}

function pluralizeIngredients(n: number): string {
  if (n === 1) return "składnik";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "składniki";
  return "składników";
}
