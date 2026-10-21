// components/finance/TransactionForm.tsx

import React, { useId, useState } from "react";
import { FormButtons } from "@/components/ui/CommonButtons";
import { getAppDate } from "@/lib/dateUtils";
import type { BudgetCategory } from "@/types/bills";
import { AmountField, CategorySelect, ProfileSelect } from "@/components/finance/FinanceFields";
import type { FinanceProfile, NewTransaction, RecurringBill } from "@/types/finance";

interface Props {
  categories: readonly BudgetCategory[];
  bills: readonly RecurringBill[];
  profiles: readonly FinanceProfile[];
  defaultProfileId: string | null;
  defaultDate?: string;
  onSave: (tx: NewTransaction) => Promise<unknown>;
  onCancel: () => void;
}

export default function TransactionForm({
  categories,
  bills,
  profiles,
  defaultProfileId,
  defaultDate,
  onSave,
  onCancel,
}: Readonly<Props>) {
  const id = useId();
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate ?? getAppDate());
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [billId, setBillId] = useState("");
  const [profileId, setProfileId] = useState(defaultProfileId ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number.parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    const isIncome = kind === "income";
    const ok = await onSave({
      date,
      amount: Math.round(value * 100) / 100,
      is_income: isIncome,
      description: description.trim(),
      category_id: categoryId || null,
      profile_id: profileId || null,
      // Powiązanie wybrane ręcznie – od razu „manual” (uczy kolejne miesiące).
      recurring_bill_id: !isIncome && billId ? billId : null,
      link_status: !isIncome && billId ? "manual" : null,
      source: "manual",
      import_key: null,
    });
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="form-card max-w-xl">
      <fieldset className="min-w-0">
        <legend className="form-label">Rodzaj:</legend>
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${kind === k ? "border-text bg-text text-card" : "border-line-strong text-text-secondary"}`}
            >
              {k === "expense" ? "Wydatek" : "Wpływ"}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <AmountField id={id} value={amount} onChange={setAmount} />
        <div>
          <label htmlFor={`${id}-date`} className="form-label">
            Data:
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-full"
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-desc`} className="form-label">
          Opis:
        </label>
        <input
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
          maxLength={300}
          placeholder="np. Biedronka, Apple"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CategorySelect
          id={id}
          value={categoryId}
          onChange={setCategoryId}
          categories={categories}
          emptyLabel={kind === "expense" ? "Dobierz automatycznie" : "Bez kategorii"}
        />
        {kind === "expense" && (
          <div>
            <label htmlFor={`${id}-bill`} className="form-label">
              Rachunek stały:
            </label>
            <select
              id={`${id}-bill`}
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
              className="input-field"
            >
              <option value="">Dobierz automatycznie</option>
              {bills
                .filter((b) => b.active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        <ProfileSelect id={id} value={profileId} onChange={setProfileId} profiles={profiles} />
      </div>
      <FormButtons onClickClose={onCancel} loading={saving} />
    </form>
  );
}
