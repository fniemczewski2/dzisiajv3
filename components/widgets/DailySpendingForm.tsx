// components/widgets/DailySpendingForm.tsx
//
// Wydatki dnia liczone z transakcji w kategoriach wskazanych w Ustawieniach
// (Finanse → kategorie wydatków dnia). Szybkie dodanie wydatku tworzy
// transakcję, więc kwota trafia też do budżetu i podsumowania miesiąca.

import React, { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { getAppDate } from "@/lib/dateUtils";
import { useSettings } from "@/hooks/db/useSettings";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { useTransactions } from "@/hooks/db/useFinance";
import { dailySpending, formatPln } from "@/lib/finance";

interface DailySpendingFormProps {
  date?: string;
}

export default function DailySpendingForm({ date }: Readonly<DailySpendingFormProps>) {
  const id = useId();
  const today = getAppDate();
  const targetDate = date ?? today;
  const year = Number(targetDate.slice(0, 4));
  const { settings } = useSettings();
  const { categories } = useBudgetCategories(year);
  const { transactions, loading, addTransaction } = useTransactions({ from: targetDate, to: targetDate });
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedNames = useMemo(() => settings.daily_spending_categories ?? [], [settings.daily_spending_categories]);
  const selectedCategories = useMemo(() => {
    const wanted = new Set(selectedNames.map((n) => n.toLocaleLowerCase("pl")));
    return categories.filter((c) => wanted.has(c.name.toLocaleLowerCase("pl")));
  }, [categories, selectedNames]);
  const total = dailySpending(transactions, targetDate, selectedNames, categories);
  const dayLabel = targetDate === today ? "dzisiaj" : format(parseISO(targetDate), "d.MM", { locale: pl });

  const save = async () => {
    const value = Number.parseFloat(amount.replace(",", "."));
    const category = categoryId || selectedCategories[0]?.id;
    if (!Number.isFinite(value) || value <= 0 || !category) return;
    setSaving(true);
    const created = await addTransaction({
      date: targetDate,
      amount: Math.round(value * 100) / 100,
      is_income: false,
      description: description.trim() || "Wydatek",
      category_id: category,
      profile_id: null,
      recurring_bill_id: null,
      link_status: null,
      source: "manual",
      import_key: null,
    });
    setSaving(false);
    if (created) {
      setAmount("");
      setDescription("");
      setAdding(false);
    }
  };

  if (loading) return null;

  return (
    <section aria-labelledby={`${id}-h`} className="widget px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id={`${id}-h`} className="flex items-center gap-3 font-medium text-text">
          <Coins className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          Wydatki <span className="text-sm font-normal text-text-secondary">{dayLabel}</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-text">{formatPln(total)}</span>
          {selectedCategories.length > 0 && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              aria-label="Dodaj wydatek"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_auto_auto]"
        >
          <label htmlFor={`${id}-amount`} className="sr-only">Kwota</label>
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            placeholder="0,00 zł"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field"
            required
          />
          <label htmlFor={`${id}-desc`} className="sr-only">Opis</label>
          <input
            id={`${id}-desc`}
            placeholder="Opis (opcjonalnie)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
          />
          <label htmlFor={`${id}-cat`} className="sr-only">Kategoria</label>
          <select
            id={`${id}-cat`}
            value={categoryId || selectedCategories[0]?.id || ""}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input-field w-auto"
          >
            {selectedCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-secondary px-4 font-semibold text-white hover:bg-secondary-hover disabled:opacity-50">
              Dodaj
            </button>
            <button type="button" onClick={() => setAdding(false)} className="min-h-11 rounded-lg px-3 text-text-secondary hover:bg-surface">
              Anuluj
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
