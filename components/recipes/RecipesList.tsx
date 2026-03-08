"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, PlusCircleIcon, Search, X } from "lucide-react";
import type { Recipe, RecipeCategory } from "../../types";
import { useRecipes } from "../../hooks/useRecipes";
import { SaveButton, CancelButton, EditButton, DeleteButton } from "../CommonButtons";
import SearchBar from "../SearchBar";

const CATEGORIES: RecipeCategory[] = [
  "śniadanie",
  "zupa",
  "danie główne",
  "przystawka",
  "sałatka",
  "deser",
];

export default function RecipesList() {
  const { recipes, products, deleteRecipe, editRecipe } = useRecipes();
  const [qText, setQText] = useState("");
  const [prodFilter, setProdFilter] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedRecipe, setEditedRecipe] = useState<Recipe | null>(null);
  const [prodInput, setProdInput] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && nameRef.current) {
      nameRef.current.focus();
    }
  }, [editingId]);

  const filteredAndSorted = useMemo(() => {
    const t = qText.trim().toLowerCase();

    const list = [...recipes].filter((r) => {
      const matchesText =
        !t ||
        r.name.toLowerCase().includes(t) ||
        (r.description ?? "").toLowerCase().includes(t);
      const matchesProd =
        prodFilter.length === 0 ||
        (r.products && prodFilter.every((p) => r.products?.includes(p)));
      return matchesText && matchesProd;
    });

    return list.sort((a, b) => {
      const ca = (a.category ?? "~").toLowerCase();
      const cb = (b.category ?? "~").toLowerCase();
      const aEmpty = a.category == null || a.category.trim() === "";
      const bEmpty = b.category == null || b.category.trim() === "";
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;

      const byCat = ca.localeCompare(cb, "pl");
      if (byCat !== 0) return byCat;
      return a.name.localeCompare(b.name, "pl");
    });
  }, [recipes, qText, prodFilter]);

  const suggestions = useMemo(() => {
    const q = prodInput.trim().toLowerCase();
    if (!q || !editedRecipe) return [];
    return products
      .filter((p) => p.toLowerCase().includes(q) && !editedRecipe.products?.includes(p))
      .slice(0, 8);
  }, [prodInput, products, editedRecipe]);

  const toggleProd = (p: string) =>
    setProdFilter((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const toggleOpen = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten przepis?")) return;
    await deleteRecipe(id);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setEditedRecipe({ ...recipe });
    setOpenId(recipe.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedRecipe(null);
    setProdInput("");
  };

  const handleSaveEdit = async () => {
    if (editedRecipe) {
      await editRecipe(editedRecipe);
      setEditingId(null);
      setEditedRecipe(null);
      setProdInput("");
    }
  };

  const commitProduct = (raw: string) => {
    if (!editedRecipe) return;
    const v = raw.trim();
    if (!v) return;
    if (!editedRecipe.products?.includes(v)) {
      setEditedRecipe({
        ...editedRecipe,
        products: [...(editedRecipe.products || []), v],
      });
    }
    setProdInput("");
  };

  const removeProduct = (p: string) => {
    if (!editedRecipe) return;
    setEditedRecipe({
      ...editedRecipe,
      products: editedRecipe.products?.filter((x) => x !== p) || [],
    });
  };

  const onProdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitProduct(prodInput);
    }
  };

  const recipeSuggestions = useMemo(() => {
    return recipes
      .map((r) => r.name)
      .filter(Boolean)
      .slice(0, 20);
  }, [recipes]);


  return (
    <div className="space-y-6">
      {/* Pasek wyszukiwania i filtrów */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center max-w-2xl mx-auto w-full">
        <div className="flex-1 w-full">
          <SearchBar
            value={qText}
            onChange={setQText}
            placeholder="Szukaj po nazwie lub składniku..."
            suggestions={recipeSuggestions}
            onSuggestionClick={setQText}
            storageKey="recipes-search"
            className="w-full"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="rounded-xl px-4 py-2.5 font-bold transition-colors shadow-sm flex items-center justify-center gap-2 h-[42px] sm:min-w-[140px] shrink-0 bg-card border border-gray-200 dark:border-gray-800 text-textSecondary hover:text-text hover:bg-surface"
        >
          {showFilters ? "Ukryj filtry" : "Pokaż filtry"}
        </button>
      </div>

      {showFilters && (
        <div className="max-w-2xl mx-auto bg-card border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-textMuted mb-3 block">Filtruj po składnikach:</span>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p}
                onClick={() => toggleProd(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                  prodFilter.includes(p)
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface text-textSecondary hover:text-text border-gray-200 dark:border-gray-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {prodFilter.length > 0 && (
            <button
              className="mt-4 w-full py-2 bg-surface hover:bg-surfaceHover text-textSecondary hover:text-text text-sm font-bold rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              onClick={() => setProdFilter([])}
            >
              Wyczyść filtry składników
            </button>
          )}
        </div>
      )}

      {/* Lista Przepisów */}
      <ul className="space-y-4 max-w-2xl mx-auto w-full">
        {filteredAndSorted.map((r) => {
          const open = openId === r.id;
          const isEditing = editingId === r.id;

          if (isEditing && editedRecipe) {
            return (
              <li
                key={r.id}
                className="bg-card border border-primary dark:border-primary-dark rounded-2xl shadow-lg p-5 animate-in fade-in"
              >
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="form-label">Nazwa potrawy:</label>
                    <input
                      ref={nameRef}
                      type="text"
                      value={editedRecipe.name}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, name: e.target.value })}
                      className="input-field font-medium"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="form-label">Kategoria:</label>
                    <select
                      value={editedRecipe.category || "śniadanie"}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, category: e.target.value as RecipeCategory })}
                      className="input-field py-1.5"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Products */}
                  <div>
                    <label className="form-label">Składniki (wciśnij Enter lub przecinek po każdym):</label>
                    <div className="flex gap-2">
                      <input
                        value={prodInput}
                        onChange={(e) => setProdInput(e.target.value)}
                        onKeyDown={onProdKeyDown}
                        placeholder="Dodaj składnik..."
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => commitProduct(prodInput)}
                        className="px-4 bg-primary text-white hover:bg-secondary rounded-xl transition-colors shadow-sm shrink-0"
                        title="Dodaj składnik"
                      >
                        <PlusCircleIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {suggestions.length > 0 && (
                      <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface shadow-lg max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 custom-scrollbar">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => commitProduct(s)}
                            className="w-full text-left px-4 py-2 hover:bg-card text-sm font-medium transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    {editedRecipe.products && editedRecipe.products.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 p-3 bg-surface border border-gray-100 dark:border-gray-800 rounded-xl">
                        {editedRecipe.products.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1.5 bg-card border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm"
                          >
                            {p}
                            <button
                              type="button"
                              onClick={() => removeProduct(p)}
                              className="text-red-500 hover:text-white hover:bg-red-500 rounded p-0.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="form-label">Przepis / Instrukcje:</label>
                    <textarea
                      value={editedRecipe.description || ""}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, description: e.target.value })}
                      className="input-field"
                      rows={5}
                      placeholder="Krok po kroku..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <SaveButton onClick={handleSaveEdit} type="button" />
                    <CancelButton onCancel={handleCancelEdit} />
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li
              key={r.id}
              className="bg-card rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-200 hover:border-primary/50 group"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleOpen(r.id)}
              >
                <div className="flex-1 pr-3">
                  <h3 className="font-bold text-lg text-text leading-tight">{r.name}</h3>
                  {r.category && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {r.category}
                    </span>
                  )}
                </div>
                <button
                  className="p-2 bg-surface text-textSecondary rounded-lg transition-colors group-hover:bg-primary/10 group-hover:text-primary shrink-0"
                >
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </button>
              </div>

              {open && (
                <div className="px-4 pb-4 pt-1 bg-surface/30 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  {r.description && (
                    <p className="text-sm text-textSecondary leading-relaxed whitespace-pre-wrap pt-3">
                      {r.description}
                    </p>
                  )}

                  {r.products && r.products.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest block mb-2">Składniki:</span>
                      <div className="flex flex-wrap gap-1.5 bg-surface p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        {r.products.map((p) => (
                          <span
                            key={p}
                            className="text-xs px-2 py-1 rounded-lg bg-card border border-gray-200 dark:border-gray-700 text-text font-medium"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end w-full gap-1.5 pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                    <EditButton onClick={() => {handleEdit(r); }} />
                    <DeleteButton onClick={() => {handleDelete(r.id); }} />
                  </div>
                </div>
              )}
            </li>
          );
        })}

        {filteredAndSorted.length === 0 && (
          <li className="col-span-full text-center py-16 bg-surface border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <Search className="w-10 h-10 mx-auto mb-3 text-textMuted opacity-50" />
            <p className="text-textSecondary font-medium">Brak przepisów spełniających kryteria.</p>
          </li>
        )}
      </ul>
    </div>
  );
}