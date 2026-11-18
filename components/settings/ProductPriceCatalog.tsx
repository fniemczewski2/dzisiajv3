// components/settings/ProductPriceCatalog.tsx
//
// Katalog cen: wyszukiwanie, ręczne dodawanie, zmiana jednostki i ceny oraz usuwanie produktów.

import React, { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MAX_PRODUCT_PRICES, PRODUCT_NAME_MAX_LENGTH } from "@/config/limits";
import type { PriceInput } from "@/hooks/db/useProductPrices";
import { formatUnitPrice, nameKey, parsePrice } from "@/lib/prices/text";
import { PRICE_UNITS, type PriceUnit, type ProductPrice } from "@/types/prices";
import { DeleteButton, EditButton } from "@/components/ui/CommonButtons";

interface Props {
  prices: readonly ProductPrice[];
  nameOptions: readonly string[];
  onSave: (input: PriceInput) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

export default function ProductPriceCatalog({ prices, nameOptions, onSave, onRemove }: Readonly<Props>) {
  const listId = useId();
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<PriceUnit | "">("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<PriceUnit | "">("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    const key = nameKey(filter);
    return key ? prices.filter((entry) => entry.name_key.includes(key)) : prices;
  }, [prices, filter]);

  const add = async () => {
    const parsed = parsePrice(price);
    if (!name.trim() || parsed === null) return;
    setSaving(true);
    const ok = await onSave({ name, unit: unit || null, avg_price: parsed, occurrences: 1 });
    setSaving(false);
    if (ok) {
      setName("");
      setUnit("");
      setPrice("");
    }
  };

  const startEdit = (entry: ProductPrice) => {
    setEditingId(entry.id);
    setEditUnit(entry.unit ?? "");
    setEditPrice(String(entry.avg_price));
  };

  const saveEdit = async (entry: ProductPrice) => {
    const parsed = parsePrice(editPrice);
    if (parsed === null) return;
    setSaving(true);
    const ok = await onSave({
      name: entry.name,
      unit: editUnit || null,
      avg_price: parsed,
      occurrences: entry.occurrences,
    });
    setSaving(false);
    if (ok) setEditingId(null);
  };

  return (
    // Domyślnie zwinięty: lista może mieć setki pozycji. Natywny <details> daje obsługę klawiatury i czytników ekranu.
    <details className="group rounded-lg border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
        <span>Katalog cen produktów ({prices.length})</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-line p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end"
        >
          <div>
            <label htmlFor={`${listId}-name`} className="form-label">
              Nowy produkt
            </label>
            <input
              id={`${listId}-name`}
              type="text"
              list={listId}
              value={name}
              maxLength={PRODUCT_NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor={`${listId}-unit`} className="form-label">
              Jednostka
            </label>
            <select
              id={`${listId}-unit`}
              value={unit}
              onChange={(e) => setUnit(e.target.value as PriceUnit | "")}
              className="input-field"
            >
              <option value="">Wybierz</option>
              {PRICE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${listId}-price`} className="form-label">
              Cena (zł)
            </label>
            <input
              id={`${listId}-price`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim() || parsePrice(price) === null || prices.length >= MAX_PRODUCT_PRICES}
            className="min-h-11 rounded-lg bg-secondary px-4 text-sm font-semibold text-on-solid transition-colors hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Dodaj
          </button>
        </form>
        <datalist id={listId}>
          {nameOptions.map((option) => (
            <option key={option} value={option} aria-label={option} />
          ))}
        </datalist>

        <label htmlFor={`${listId}-filter`} className="form-label">
          Szukaj w katalogu ({prices.length})
        </label>
        <input
          id={`${listId}-filter`}
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field mb-3"
        />

        {visible.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {prices.length === 0
              ? "Katalog jest pusty. Wczytaj CSV albo paragon."
              : "Brak produktów pasujących do wyszukiwania."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((entry) => {
              const editing = editingId === entry.id;
              return (
                <li key={entry.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 font-medium text-text">{entry.name}</span>
                  {editing ? (
                    <>
                      <select
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value as PriceUnit | "")}
                        aria-label={`Jednostka: ${entry.name}`}
                        className="input-field w-28 py-1.5"
                      >
                        <option value="">Wybierz</option>
                        {PRICE_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        aria-label={`Cena (zł): ${entry.name}`}
                        className="input-field w-28 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => void saveEdit(entry)}
                        disabled={saving || parsePrice(editPrice) === null}
                        className="min-h-11 rounded-lg bg-secondary px-3 text-sm font-semibold text-on-solid disabled:opacity-60"
                      >
                        Zapisz
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-11 rounded-lg border border-line-strong px-3 text-sm text-text-secondary"
                      >
                        Anuluj
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-text-secondary">
                        {formatUnitPrice(entry.avg_price, entry.unit)}
                        <span className="ml-2 text-xs text-text-muted">({entry.occurrences} wyst.)</span>
                      </span>
                      <EditButton onClick={() => startEdit(entry)} small ariaLabel={`Edytuj cenę: ${entry.name}`} />
                      <DeleteButton
                        onClick={() => void onRemove(entry.id)}
                        small
                        ariaLabel={`Usuń z katalogu: ${entry.name}`}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
