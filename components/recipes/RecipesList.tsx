"use client";
import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Recipe } from "../../types";
import { useRecipes } from "../../hooks/useRecipes";
import Layout from "../Layout";

type Props = { userEmail: string };

export default function RecipesList({ userEmail }: Props) {
  const { recipes, products } = useRecipes(userEmail);
  const [qText, setQText] = useState("");
  const [prodFilter, setProdFilter] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesText =
        !t ||
        r.name.toLowerCase().includes(t) ||
        (r.description ?? "").toLowerCase().includes(t);
      const matchesProd =
        prodFilter.length === 0 ||
        (r.products && prodFilter.every((p) => r.products?.includes(p)));
      return matchesText && matchesProd;
    });
  }, [recipes, qText, prodFilter]);

  const toggleProd = (p: string) =>
    setProdFilter((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center max-w-2xl mx-auto">
        <input
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Szukaj po nazwie/opisie…"
          className="flex-1 rounded-xl border px-3 py-2 bg-white"
        />
        <div className="flex-1">
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
      </div>

      {/* Bills-like list */}
      <ul className="space-y-4 max-w-2xl mx-auto">
        {filtered.map((r) => (
          <li
            key={r.id}
            className="bg-card rounded-xl shadow-md p-4 flex flex-row items-center transition hover:shadow-lg hover:bg-gray-100"
          >
            {/* Left: main info */}
            <div className="flex flex-col flex-1 space-y-1 text-sm sm:text-base">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-lg text-neutral-900">
                  {r.name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {r.created_at
                    ? format(
                        typeof r.created_at === "string"
                          ? parseISO(r.created_at)
                          : r.created_at,
                        "dd.MM.yyyy"
                      )
                    : ""}
                </span>
              </div>

              {r.description && (
                <span className="text-gray-600 text-sm">{r.description}</span>
              )}

              {/* Category chip (mirrors the +/- accent in BillList by using color emphasis) */}
              {r.category && (
                <span className="inline-block text-xs w-fit px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  {r.category}
                </span>
              )}

              {/* Products as small chips */}
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
            </div>

            {/* Right: optional slot for future actions (kept empty to stay BillList-like layout) */}
            <div className="flex flex-row flex-nowrap flex-1 justify-end text-sm" />
          </li>
        ))}

        {filtered.length === 0 && (
          <li className="text-center text-sm text-neutral-500 py-8">
            Brak przepisów spełniających kryteria.
          </li>
        )}
      </ul>
    </div>
    </Layout>
  );
}
