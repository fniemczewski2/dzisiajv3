"use client";
import { useMemo, useState } from "react";
import type { Recipe, RecipeCategory } from "../../types/index";
import { useRecipes } from "../../hooks/useRecipes"

type Props = { userEmail: string };

export default function RecipesList({ userEmail }: Props) {
  const { recipes, products } = useRecipes(userEmail);
  const [qText, setQText] = useState("");
  const [prodFilter, setProdFilter] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    return recipes.filter(r => {
      const matchesText = !t || r.name.toLowerCase().includes(t) || r.description.toLowerCase().includes(t);
      const matchesProd = prodFilter.length === 0 || (r.products && prodFilter.every(p => r.products.includes(p)));
      return matchesText && matchesProd;
    });
  }, [recipes, qText, prodFilter]);

  const byCat = useMemo(() => {
    const g = new Map<RecipeCategory, Recipe[]>();
    filtered.forEach(r => {
      const k = r.category as RecipeCategory;
      g.set(k, [...(g.get(k) || []), r]);
    });
    return g;
  }, [filtered]);

  const toggleProd = (p: string) =>
    setProdFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <input
          value={qText}
          onChange={e=>setQText(e.target.value)}
          placeholder="Szukaj po nazwie/opisie…"
          className="flex-1 rounded-xl border px-3 py-2"
        />
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            {products.map(p => (
              <button key={p} onClick={()=>toggleProd(p)}
                className={`px-3 py-1 rounded-full border ${prodFilter.includes(p) ? "bg-black text-white" : "bg-white"}`}>
                {p}
              </button>
            ))}
          </div>
          {prodFilter.length>0 && (
            <button className="mt-2 text-sm underline" onClick={()=>setProdFilter([])}>Wyczyść filtry</button>
          )}
        </div>
      </div>

      {(["śniadanie","zupa","danie główne","przystawka","sałatka","deser"] as RecipeCategory[]).map(cat => {
        const rows = byCat.get(cat) || [];
        if (rows.length === 0) return null;
        return (
          <section key={cat} className="space-y-3">
            <h3 className="text-lg font-semibold">
              {cat} <span className="text-neutral-400">({rows.length})</span>
            </h3>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map(r => (
                <li key={r.id} className="rounded-2xl border p-3 bg-white dark:bg-neutral-900">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{r.name}</h4>
                    <span className="text-xs text-neutral-500">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{r.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.products?.map(p => <span key={p} className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">{p}</span>)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
