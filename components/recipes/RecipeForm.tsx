// components/recipes/RecipeForm.tsx

import React, { useEffect, useId, useMemo, useRef, useState, SyntheticEvent } from "react";
import { PlusCircleIcon, X } from "lucide-react";
import {
  RECIPE_CATEGORIES,
  DEFAULT_RECIPE_CATEGORY,
  isRecipeCategory,
  type NewRecipe,
  type RecipeCategory,
} from "@/types/recipes";
import {
  hasProduct,
  isRecipeValid,
  RECIPE_DESCRIPTION_MAX_LENGTH,
  RECIPE_NAME_MAX_LENGTH,
  RECIPE_NAME_MIN_LENGTH,
  RECIPE_PRODUCT_MAX_LENGTH,
} from "@/lib/recipeUtils";
import { FormButtons } from "../ui/CommonButtons";

interface RecipeFormProps {
  /** Wszystkie znane składniki – do podpowiedzi. */
  products: readonly string[];
  loading?: boolean;
  /** Dane początkowe – podane oznaczają tryb edycji. */
  initial?: NewRecipe;
  /** Zwraca `true`, gdy zapis się udał (formularz może się wtedy zamknąć/wyczyścić). */
  onSubmit: (recipe: NewRecipe) => Promise<boolean>;
  onCancel?: () => void;
  /** Ustawia fokus na polu nazwy po otwarciu formularza (akcja użytkownika, nie ładowanie strony). */
  focusNameOnOpen?: boolean;
  className?: string;
}

const EMPTY: NewRecipe = { name: "", category: DEFAULT_RECIPE_CATEGORY, products: [], description: "" };

export default function RecipeForm({
  products,
  loading = false,
  initial,
  onSubmit,
  onCancel,
  focusNameOnOpen = false,
  className = "form-card max-w-2xl",
}: Readonly<RecipeFormProps>) {
  const start = initial ?? EMPTY;
  const [name, setName] = useState(start.name);
  const [category, setCategory] = useState<RecipeCategory>(
    isRecipeCategory(start.category) ? start.category : DEFAULT_RECIPE_CATEGORY
  );
  const [description, setDescription] = useState(start.description ?? "");
  const [picked, setPicked] = useState<string[]>(start.products ?? []);
  const [prodInput, setProdInput] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const prefix = useId();

  useEffect(() => {
    if (focusNameOnOpen) nameRef.current?.focus();
  }, [focusNameOnOpen]);

  const suggestions = useMemo(() => {
    const q = prodInput.trim().toLocaleLowerCase("pl");
    if (!q) return [];
    return products.filter((p) => p.toLocaleLowerCase("pl").includes(q) && !hasProduct(picked, p)).slice(0, 8);
  }, [prodInput, products, picked]);

  const commitProduct = (raw: string) => {
    const v = raw.trim().replaceAll(/\s+/g, " ").slice(0, RECIPE_PRODUCT_MAX_LENGTH);
    if (!v) return;
    setPicked((prev) => (hasProduct(prev, v) ? prev : [...prev, v]));
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

  const onProdChange = (value: string) => {
    if (value.includes(",")) {
      const parts = value.split(",");
      const last = parts.pop() ?? "";
      parts.forEach(commitProduct);
      setProdInput(last);
      return;
    }
    setProdInput(value);
  };

  const removeProduct = (p: string) => setPicked((prev) => prev.filter((x) => x !== p));
  const pendingProducts = prodInput.trim() ? [...picked, prodInput] : picked;
  const canSave = isRecipeValid({ name, products: pendingProducts });

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave || loading) return;

    const ok = await onSubmit({ name, category, products: pendingProducts, description });
    if (ok && !initial) {
      setName("");
      setCategory(DEFAULT_RECIPE_CATEGORY);
      setDescription("");
      setPicked([]);
      setProdInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div>
        <label htmlFor={`${prefix}-name`} className="form-label">
          Nazwa przepisu:
        </label>
        <input
          id={`${prefix}-name`}
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          placeholder="np. Naleśniki z twarogiem"
          required
          minLength={RECIPE_NAME_MIN_LENGTH}
          maxLength={RECIPE_NAME_MAX_LENGTH}
          disabled={loading}
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-category`} className="form-label">
          Kategoria:
        </label>
        <select
          id={`${prefix}-category`}
          value={category}
          onChange={(e) => setCategory(e.target.value as RecipeCategory)}
          className="input-field"
          disabled={loading}
        >
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-product`} className="form-label">
          Składniki:
        </label>
        <div className="flex gap-2">
          <input
            id={`${prefix}-product`}
            value={prodInput}
            onChange={(e) => onProdChange(e.target.value)}
            onKeyDown={onProdKeyDown}
            placeholder="np. mąka, jajka, mleko (zatwierdź Enterem)"
            className="input-field"
            maxLength={RECIPE_PRODUCT_MAX_LENGTH}
            autoComplete="off"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => commitProduct(prodInput)}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
            disabled={loading || !prodInput.trim()}
            aria-label="Dodaj składnik"
          >
            Dodaj <PlusCircleIcon className="h-4 w-4" />
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="card mt-1 max-h-48 divide-y divide-line overflow-hidden overflow-y-auto rounded-lg shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commitProduct(s)}
                className="w-full px-4 py-2 text-left text-sm text-text transition-colors hover:bg-surface"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {picked.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Wybrane składniki">
            {picked.map((p) => (
              <li
                key={p}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm text-text-secondary"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removeProduct(p)}
                  className="text-text-muted transition-colors hover:text-danger"
                  disabled={loading}
                  aria-label={`Usuń składnik ${p}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label htmlFor={`${prefix}-desc`} className="form-label">
          Sposób przygotowania / Opis:
        </label>
        <textarea
          id={`${prefix}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
          rows={initial ? 6 : 4}
          maxLength={RECIPE_DESCRIPTION_MAX_LENGTH}
          placeholder="Krótki opis lub kroki przygotowania…"
          disabled={loading}
        />
      </div>
      <FormButtons disabled={!canSave} onClickClose={onCancel} loading={loading} />
    </form>
  );
}
