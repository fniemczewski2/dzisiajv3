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

export default function RecipesList({ recipes, products, loading = false, onEdit, onDelete }: Readonly<RecipesListProps>) {
  const [qText, setQText] = useState("");
  const [prodFilter, setProdFilter] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => filterRecipes(recipes, qText, prodFilter), [recipes, qText, prodFilter]);

  const recipeSuggestions = useMemo(
    () => recipes.map((r) => r.name).filter(Boolean).slice(0, 20),
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
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center max-w-2xl mx-auto w-full">
        <div className="flex-1 w-full">
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
          className="rounded-xl px-4 py-2.5 font-bold transition-colors shadow-sm flex items-center justify-center gap-2 h-10.5 sm:min-w-35 shrink-0 card text-text-secondary hover:text-text hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showFilters ? "Ukryj filtry" : "Pokaż filtry"}
          {prodFilter.length > 0 && (
            <span className="ml-1 rounded-full bg-secondary text-white text-xs px-2 py-0.5">{prodFilter.length}</span>
          )}
        </button>
      </div>

      {showFilters && products.length > 0 && (
        <div className="max-w-2xl mx-auto card p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-text-muted mb-3 block">
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
              className="mt-4 w-full py-2 bg-surface hover:bg-surface-hover text-text-secondary hover:text-text text-sm font-bold rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              onClick={() => setProdFilter([])}
            >
              Wyczyść filtry składników
            </button>
          )}
        </div>
      )}

      <ul className="space-y-4 max-w-2xl mx-auto w-full">
        {filtered.map((r) => {
          const open = openId === r.id;

          if (editingId === r.id) {
            return (
              <li key={r.id} className="bg-card border border-primary dark:border-primary rounded-2xl shadow-lg p-5 animate-in fade-in">
                <RecipeForm
                  className="space-y-4"
                  products={products}
                  loading={loading}
                  initial={{ name: r.name, category: r.category, products: r.products ?? [], description: r.description ?? "" }}
                  onSubmit={(data) => handleSaveEdit(r, data)}
                  onCancel={() => setEditingId(null)}
                  autoFocus
                />
              </li>
            );
          }

          const panelId = `recipe-panel-${r.id}`;
          return (
            <li key={r.id} className="card rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:border-primary group">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => toggleOpen(r.id)}
                aria-expanded={open}
                aria-controls={panelId}
              >
                <div className="flex-1 pr-3">
                  <h3 className="font-bold text-lg text-text leading-tight">{r.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {r.category && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-primary border border-primary rounded-md text-[10px] font-semibold">
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
                <span className="p-2 bg-surface text-text-secondary rounded-lg shrink-0" aria-hidden="true">
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </span>
              </button>
              {open && (
                <div id={panelId} className="px-4 pb-4 pt-1 bg-card border-t border-gray-100 dark:border-gray-800 space-y-4">
                  {r.products && r.products.length > 0 && (
                    <div className="pt-3">
                      <span className="text-[10px] font-bold text-text-muted block mb-2">Składniki:</span>
                      <ul className="flex flex-wrap gap-1.5">
                        {r.products.map((p) => (
                          <li key={p} className="text-xs px-2 py-1 rounded-lg card text-text font-medium">{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.description && (
                    <div>
                      <span className="text-[10px] font-bold text-text-muted block mb-2">Przygotowanie:</span>
                      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{r.description}</p>
                    </div>
                  )}
                  <div className="flex justify-end w-full gap-1.5 pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                    <EditButton onClick={() => setEditingId(r.id)} disabled={isTemp(r.id) || loading} />
                    <DeleteButton onClick={() => handleDelete(r.id)} disabled={isTemp(r.id) || loading} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <NoResultsState text="przepisów" isSearch={hasActiveFilters} />
        )}
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
