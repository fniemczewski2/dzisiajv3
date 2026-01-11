// components/recipes/RecipeForm.tsx
"use client";

import React, { useEffect, useMemo, useState, FormEvent } from "react";
import { PlusCircleIcon } from "lucide-react";
import type { Recipe, RecipeCategory } from "../../types";
import { useRecipes } from "../../hooks/useRecipes";
import LoadingState from "../LoadingState";
import { useSession } from "@supabase/auth-helpers-react";
import { AddButton, CancelButton } from "../CommonButtons";

interface RecipeFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

const CATEGORIES: RecipeCategory[] = [
  "śniadanie",
  "zupa",
  "danie główne",
  "przystawka",
  "sałatka",
  "deser",
];

export default function RecipeForm({
  onChange,
  onCancel,
}: RecipeFormProps) {
  const { addRecipe, loading, products: allProducts } = useRecipes();
  const session  = useSession();
  const userEmail = session?.user.email;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("śniadanie");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [prodInput, setProdInput] = useState("");

  const suggestions = useMemo(() => {
    const q = prodInput.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter((p) => p.toLowerCase().includes(q) && !picked.includes(p))
      .slice(0, 8);
  }, [prodInput, allProducts, picked]);

  const commitProduct = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (!picked.includes(v)) {
      setPicked((prev) => [...prev, v]);
    }
    setProdInput("");
  };

  const onProdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitProduct(prodInput);
    }
    if (e.key === "Backspace" && !prodInput && picked.length > 0) {
      e.preventDefault();
      setPicked((prev) => prev.slice(0, -1));
    }
  };

  const removeProduct = (p: string) => {
    setPicked((prev) => prev.filter((x) => x !== p));
  };

  const canSave = name.trim().length > 1 && picked.length > 0;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave) return;

    const payload: Recipe = {
      name: name.trim(),
      category,
      products: picked.map((p) => p.trim()),
      description: description.trim(),
      user_email: userEmail,
    } as Recipe;

    await addRecipe({
        name: payload.name,
        category: payload.category,
        products: payload.products,
        description: payload.description,
      });
    
    onChange();
      setName("");
      setCategory("śniadanie");
      setDescription("");
      setPicked([]);
      setProdInput("");

    if (onCancel) onCancel();
  
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-card p-4 rounded-xl shadow max-w-2xl"
    >
      <div>
        <label htmlFor="rf-name" className="block text-sm font-medium mb-1">
          Nazwa
        </label>
        <input
          id="rf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Naleśniki z twarogiem"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="rf-category"
          className="block text-sm font-medium mb-1"
        >
          Kategoria
        </label>
        <select
          id="rf-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as RecipeCategory)}
          className="w-full p-2 border rounded"
          disabled={loading}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Produkty</label>

        <div className="flex gap-2">
          <input
            value={prodInput}
            onChange={(e) => setProdInput(e.target.value)}
            onKeyDown={onProdKeyDown}
            placeholder="np. mąka, jajka, mleko…"
            className="flex-1 p-2 border rounded"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => commitProduct(prodInput)}
            className="px-3 py-2 border rounded flex items-center gap-2 hover:bg-gray-50 transition disabled:opacity-50"
            disabled={loading}
          >
            Dodaj
            <PlusCircleIcon className="w-4 h-4" />
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-1 rounded-md border bg-white divide-y shadow-lg">
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
        {picked.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {picked.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removeProduct(p)}
                  className="text-gray-500 hover:text-gray-900"
                  aria-label={`Usuń ${p}`}
                  disabled={loading}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="rf-desc" className="block text-sm font-medium mb-1">
          Opis
        </label>
        <textarea
          id="rf-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="Krótki opis lub kroki przygotowania…"
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 items-center">
        <AddButton loading={loading} disabled={!canSave} />

        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}

        {loading && <LoadingState />}
      </div>
    </form>
  );
}