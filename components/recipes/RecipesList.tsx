"use client";
import React, { useMemo, useState } from "react";
import { Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { Recipe } from "../../types";
import { useRecipes } from "../../hooks/useRecipes";

type Props = {
  userEmail: string;
  onEdit?: (r: Recipe) => void;
  onDelete?: (id: string) => void;
};

export default function RecipesList({ userEmail, onEdit, onDelete }: Props) {
  const { recipes, products } = useRecipes(userEmail);
  const [qText, setQText] = useState("");
  const [prodFilter, setProdFilter] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false); // NEW: hideable filters

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

  const toggleProd = (p: string) =>
    setProdFilter((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const toggleOpen = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center max-w-2xl mx-auto">
        <input
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Szukaj po nazwie/opisie…"
          className="flex-1 rounded-xl border px-3 py-2 bg-white"
        />

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
          return (
            <li key={r.id} className="bg-card rounded-xl shadow mb-4 overflow-hidden">
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
                    <span className="inline-block text-xs w-fit px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
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

                  <div className="flex flex-row justify-end gap-4 pt-2 border-t">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(r)}
                        title="Edytuj przepis"
                        className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                        <span className="text-xs mt-1">Edytuj</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!r.id) return;
                          onDelete?.(r.id);
                        }}
                        title="Usuń przepis"
                        className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="text-xs mt-1">Usuń</span>
                      </button>
                    )}
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
