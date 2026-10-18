// components/settings/FinanceSettings.tsx
//
// Ustawienia Finansów: profile finansowe (do 5, zapis od razu), kategorie
// liczone jako „Wydatki dnia” i push w dniu terminu płatności (zapis z resztą
// formularza ustawień).

import React, { useId, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useFinanceProfiles } from "@/hooks/db/useFinance";
import { useBudgetCategories } from "@/hooks/db/useBudgetCategories";
import { CATEGORY_PALETTE } from "@/lib/categoryColors";
import { MAX_FINANCE_PROFILES } from "@/types/finance";
import { getAppDate } from "@/lib/dateUtils";

interface Props {
  dailyCategories: string[];
  onDailyCategoriesChange: (next: string[]) => void;
}

export default function FinanceSettings({ dailyCategories, onDailyCategoriesChange }: Readonly<Props>) {
  const id = useId();
  const { profiles, addProfile, updateProfile, removeProfile, maxReached } = useFinanceProfiles();
  const { categories } = useBudgetCategories(Number(getAppDate().slice(0, 4)));
  const [draft, setDraft] = useState("");
  const selected = new Set(dailyCategories.map((n) => n.toLocaleLowerCase("pl")));

  const toggleCategory = (name: string) => {
    const key = name.toLocaleLowerCase("pl");
    onDailyCategoriesChange(
      selected.has(key) ? dailyCategories.filter((n) => n.toLocaleLowerCase("pl") !== key) : [...dailyCategories, name]
    );
  };

  return (
    <section id="finance" aria-labelledby={`${id}-h`} className="mt-2 space-y-5 rounded-xl border border-line p-4">
      <h4 id={`${id}-h`} className="flex items-center gap-2 text-sm font-semibold text-text">
        <Wallet className="h-4 w-4" aria-hidden="true" /> Finanse
      </h4>

      <fieldset className="min-w-0 space-y-2">
        <legend className="mb-1 text-sm font-medium text-text">
          Profile finansowe ({profiles.length}/{MAX_FINANCE_PROFILES})
        </legend>
        <p className="text-sm text-text-secondary">
          Np. konto osobiste, firmowe, wspólne. Zmiany zapisują się od razu.
        </p>
        {profiles.map((p, i) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-p-${p.id}`} className="sr-only">
              Nazwa profilu {i + 1}
            </label>
            <input
              id={`${id}-p-${p.id}`}
              defaultValue={p.name}
              maxLength={40}
              onBlur={(e) =>
                e.target.value.trim() &&
                e.target.value.trim() !== p.name &&
                void updateProfile(p.id, { name: e.target.value.trim() })
              }
              className="input-field min-w-40 flex-1"
            />
            <label htmlFor={`${id}-c-${p.id}`} className="sr-only">
              Kolor profilu {p.name}
            </label>
            <select
              id={`${id}-c-${p.id}`}
              value={p.color ?? ""}
              onChange={(e) => void updateProfile(p.id, { color: e.target.value || null })}
              className="input-field w-auto"
            >
              <option value="">bez koloru</option>
              {CATEGORY_PALETTE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void removeProfile(p.id)}
              aria-label={`Usuń profil ${p.name}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {!maxReached && (
          <div className="flex items-center gap-2">
            <label htmlFor={`${id}-new`} className="sr-only">
              Nowy profil
            </label>
            <input
              id={`${id}-new`}
              value={draft}
              maxLength={40}
              placeholder="Nowy profil, np. Firma"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draft.trim()) void addProfile(draft).then(() => setDraft(""));
                }
              }}
              className="input-field flex-1"
            />
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => void addProfile(draft).then(() => setDraft(""))}
              className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-primary disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Dodaj
            </button>
          </div>
        )}
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-1 text-sm font-medium text-text">Kategorie liczone jako „Wydatki dnia”</legend>
        <p className="mb-2 text-sm text-text-secondary">
          Kwota na planie dnia to suma transakcji z dnia w zaznaczonych kategoriach.
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-text-secondary">Najpierw dodaj kategorie w Budżecie.</p>
        ) : (
          <div className="grid gap-x-4 sm:grid-cols-2">
            {categories.map((c) => (
              <div key={c.id} className="flex min-h-11 items-center gap-3">
                <input
                  id={`${id}-d-${c.id}`}
                  type="checkbox"
                  className="h-5 w-5"
                  checked={selected.has(c.name.toLocaleLowerCase("pl"))}
                  onChange={() => toggleCategory(c.name)}
                />
                <label htmlFor={`${id}-d-${c.id}`} className="cursor-pointer text-text">
                  {c.name}
                </label>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </section>
  );
}
