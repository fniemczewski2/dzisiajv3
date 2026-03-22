"use client";

import React, { useMemo, useState, SyntheticEvent } from "react";
import { PlusCircleIcon, X } from "lucide-react";
import type { RecipeCategory } from "../../types";
import { useRecipes } from "../../hooks/useRecipes";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton, FormButtons } from "../CommonButtons";

interface RecipeFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

const CATEGORIES: RecipeCategory[] = [
  "śniadanie", "zupa", "danie główne", "przystawka", "sałatka", "deser",
];

export default function RecipeForm({ onChange, onCancel }: RecipeFormProps) {
  const { addRecipe, loading, products: allProducts } = useRecipes();
  const { toast } = useToast();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("śniadanie");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [prodInput, setProdInput] = useState("");

  const suggestions = useMemo(() => {
    const q = prodInput.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter((p) => p.toLowerCase().includes(q) && !picked.includes(p)).slice(0, 8);
  }, [prodInput, allProducts, picked]);

  const commitProduct = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (!picked.includes(v)) setPicked((prev) => [...prev, v]);
    setProdInput("");
  };

  const onProdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitProduct(prodInput); }
    if (e.key === "Backspace" && !prodInput && picked.length > 0) {
      e.preventDefault();
      setPicked((prev) => prev.slice(0, -1));
    }
  };

  const removeProduct = (p: string) => setPicked((prev) => prev.filter((x) => x !== p));
  const canSave = name.trim().length > 1 && picked.length > 0;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave) return;

    await withRetry(
      () => addRecipe({
        name: name.trim(),
        category,
        products: picked.map((p) => p.trim()),
        description: description.trim(),
      } as any),
      toast,
      { context: "RecipeForm.addRecipe", userId: user?.id }
    );
    toast.success("Dodano pomyślnie.");
    setName(""); setCategory("śniadanie"); setDescription(""); setPicked([]); setProdInput("");
    onChange();
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-2xl">
      <div>
        <label htmlFor="rf-name" className="form-label">Nazwa przepisu:</label>
        <input id="rf-name" value={name} onChange={(e) => setName(e.target.value)}
          className="input-field" placeholder="np. Naleśniki z twarogiem" required disabled={loading} />
      </div>
      <div>
        <label htmlFor="rf-category" className="form-label">Kategoria:</label>
        <select id="rf-category" value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory)}
          className="input-field" disabled={loading}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Składniki:</label>
        <div className="flex gap-2">
          <input value={prodInput} onChange={(e) => setProdInput(e.target.value)}
            onKeyDown={onProdKeyDown}
            placeholder="np. mąka, jajka, mleko (zatwierdź Enterem)"
            className="input-field" disabled={loading} />
          <button type="button" onClick={() => commitProduct(prodInput)}
            className="px-4 py-2 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            disabled={loading}>
            Dodaj <PlusCircleIcon className="w-4 h-4" />
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-1 rounded-lg card divide-y divide-gray-100 dark:divide-gray-800 shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => commitProduct(s)}
                className="w-full text-left px-4 py-2 hover:bg-surface text-text text-sm transition-colors">{s}</button>
            ))}
          </div>
        )}
        {picked.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {picked.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 bg-surface border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full text-sm text-textSecondary">
                {p}
                <button type="button" onClick={() => removeProduct(p)}
                  className="text-textMuted hover:text-red-500 transition-colors" disabled={loading}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <label htmlFor="rf-desc" className="form-label">Sposób przygotowania / Opis:</label>
        <textarea id="rf-desc" value={description} onChange={(e) => setDescription(e.target.value)}
          className="input-field" rows={4} placeholder="Krótki opis lub kroki przygotowania…" disabled={loading} />
      </div>
      <div className="flex gap-3 items-center pt-2">
        <FormButtons disabled={!canSave} onClickClose={onCancel} loading={loading} />
      </div>
    </form>
  );
}