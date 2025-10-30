// components/recipes/RecipeForm.tsx
"use client";

import React, { useEffect, useMemo, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, Save } from "lucide-react";
import type { Recipe, RecipeCategory } from "../../types";

interface RecipeFormProps {
  userEmail: string;
  onChange: () => void;
  onCancel?: () => void;
  initial?: Recipe; 
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
  userEmail,
  onChange,
  onCancel,
  initial,
}: RecipeFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<RecipeCategory>("śniadanie");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<string[]>([]); // wybrane produkty (tagi)

  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [prodInput, setProdInput] = useState("");
  const suggestions = useMemo(() => {
    const q = prodInput.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter(
        (p) => p.toLowerCase().includes(q) && !picked.includes(p)
      )
      .slice(0, 8);
  }, [prodInput, allProducts, picked]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name ?? "");
      setCategory((initial.category as RecipeCategory) ?? "śniadanie");
      setDescription(initial.description ?? "");
      setPicked(Array.isArray(initial.products) ? initial.products : []);
    } else {
      setName("");
      setCategory("śniadanie");
      setDescription("");
      setPicked([]);
    }
  }, [initial]);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("name")
        .eq("user_email", userEmail)
        .order("name", { ascending: true });
      if (!error && data) {
        setAllProducts(
          Array.from(new Set(data.map((r: { name: string }) => r.name))).sort()
        );
      }
    };
    run();
  }, [supabase, userEmail]);

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

  const canSave =
    name.trim().length > 1 &&
    picked.length > 0;

  const upsertProducts = async (names: string[]) => {
    const uniq = Array.from(new Set(names.map((n) => n.trim()))).filter(Boolean);
    if (uniq.length === 0) return;

    const { error } = await supabase
      .from("products")
      .upsert(
        uniq.map((n) => ({ name: n, user_email: userEmail })),
        { onConflict: "user_email,name", ignoreDuplicates: true }
      );

    if (!error) {
      setAllProducts((prev) =>
        Array.from(new Set([...prev, ...uniq])).sort()
      );
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave) return;

    setLoading(true);

    await upsertProducts(picked);

    const payload = {
      name: name.trim(),
      category,
      products: picked.map((p) => p.trim()),
      description: description.trim(),
      user_email: userEmail,
    };

    if (isEdit && initial?.id) {
      await supabase.from("recipes").update(payload).eq("id", initial.id);
    } else {
      await supabase.from("recipes").insert(payload);
    }

    setLoading(false);
    onChange();

    if (!isEdit) {
      // reset przy tworzeniu nowego
      setName("");
      setCategory("śniadanie");
      setDescription("");
      setPicked([]);
      setProdInput("");
    }
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
          />
          <button
            type="button"
            onClick={() => commitProduct(prodInput)}
            className="px-3 py-2 border rounded flex items-center gap-2"
          >
            Dodaj
            <PlusCircleIcon className="w-4 h-4" />
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-1 rounded-md border bg-white divide-y">
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
        />
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="submit"
          disabled={!canSave || loading}
          className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50"
        >
          {isEdit ? (
            <>
              Zapisz
              <Save className="w-5 h-5" />
            </>
          ) : (
            <>
              Dodaj
              <PlusCircleIcon className="w-5 h-5" />
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            Anuluj
          </button>
        )}

        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
