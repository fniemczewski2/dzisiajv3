"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, PlusCircleIcon, Search, Edit2, Trash2 } from "lucide-react";
import type { Recipe, RecipeCategory } from "../../types";
import { useRecipes } from "../../hooks/useRecipes";
import { SaveButton, CancelButton } from "../CommonButtons";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 md:items-center max-w-2xl mx-auto">
        <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Szukaj przepisów…"
          className="flex-1 rounded-xl border pl-10 pr-3 py-2 bg-white w-full"
        />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="rounded-xl border px-3 py-2 bg-white hover:bg-gray-50 transition"
        >
          {showFilters ? "Ukryj filtry" : "Pokaż filtry"}
        </button>
      </div>
      {showFilters && (
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p}
                onClick={() => toggleProd(p)}
                className={`px-3 py-1 rounded-full border transition-colors ${
                  prodFilter.includes(p)
                    ? "bg-black text-white"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {prodFilter.length > 0 && (
            <button
              className="mt-2 text-sm underline text-neutral-600 hover:text-neutral-900"
              onClick={() => setProdFilter([])}
            >
              Wyczyść filtry
            </button>
          )}
        </div>
      )}

      <ul className="space-y-4 max-w-2xl mx-auto">
        {filteredAndSorted.map((r) => {
          const open = openId === r.id;
          const isEditing = editingId === r.id;

          if (isEditing && editedRecipe) {
            return (
              <li
                key={r.id}
                className="bg-gray-50 border-2 border-gray-300 rounded-xl shadow-lg p-4"
              >
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Nazwa:
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      value={editedRecipe.name}
                      onChange={(e) =>
                        setEditedRecipe({ ...editedRecipe, name: e.target.value })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Kategoria:
                    </label>
                    <select
                      value={editedRecipe.category || "śniadanie"}
                      onChange={(e) =>
                        setEditedRecipe({
                          ...editedRecipe,
                          category: e.target.value as RecipeCategory,
                        })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Products */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Produkty:
                    </label>
                    <div className="flex gap-2 mt-1">
                      <input
                        value={prodInput}
                        onChange={(e) => setProdInput(e.target.value)}
                        onKeyDown={onProdKeyDown}
                        placeholder="Dodaj produkt…"
                        className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => commitProduct(prodInput)}
                        className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition"
                      >
                        <PlusCircleIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {suggestions.length > 0 && (
                      <div className="mt-1 rounded-md border bg-white divide-y shadow-lg max-h-40 overflow-y-auto">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => commitProduct(s)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    {editedRecipe.products && editedRecipe.products.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editedRecipe.products.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm"
                          >
                            {p}
                            <button
                              type="button"
                              onClick={() => removeProduct(p)}
                              className="text-gray-500 hover:text-gray-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Opis:
                    </label>
                    <textarea
                      value={editedRecipe.description || ""}
                      onChange={(e) =>
                        setEditedRecipe({
                          ...editedRecipe,
                          description: e.target.value,
                        })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-2">
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
              className="bg-card rounded-xl shadow mb-4 overflow-hidden"
            >
              <div
                className="flex flex-row items-center justify-between px-3 py-2 sm:p-4 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => toggleOpen(r.id)}
              >
                <h3 className="font-semibold flex flex-row items-center text-lg">
                  {r.name}
                </h3>
                {open ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>

              {open && (
                <div className="px-3 py-3 text-sm shadow-inner space-y-2">
                  {r.category && (
                    <span className="inline-block text-xs w-fit px-1 py-0.5 bg-primary-50 text-primary">
                      {r.category}
                    </span>
                  )}

                  {r.description && (
                    <p className="text-gray-600 text-sm">{r.description}</p>
                  )}

                  {r.products && r.products.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {r.products.map((p) => (
                        <span
                          key={p}
                          className="text-xs px-2 py-1 rounded-full bg-neutral-100"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-row justify-end gap-2 sm:gap-3 pt-2 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(r);
                      }}
                      title="Edytuj przepis"
                      className="flex flex-col px-1.5 items-center justify-center rounded-lg text-primary hover:text-secondary transition-colors"
                    >
                      <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="text-[9px] sm:text-[11px]">Edytuj</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!r.id) return;
                        handleDelete(r.id);
                      }}
                      title="Usuń przepis"
                      className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="text-[9px] sm:text-[11px]">Usuń</span>
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}

        {filteredAndSorted.length === 0 && (
          <li className="text-center text-sm text-neutral-500 py-8">
            Brak przepisów spełniających kryteria.
          </li>
        )}
      </ul>
    </div>
  );
}