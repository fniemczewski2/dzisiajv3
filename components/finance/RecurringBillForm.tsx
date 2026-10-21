// components/finance/RecurringBillForm.tsx

import React, { useId, useState } from "react";
import RecurrenceEditor from "@/components/ui/RecurrenceEditor";
import { FormButtons } from "@/components/ui/CommonButtons";
import type { RecurrenceRule } from "@/shared/recurrence";
import type { BudgetCategory } from "@/types/bills";
import { AmountField, CategorySelect, ProfileSelect } from "@/components/finance/FinanceFields";
import type { FinanceProfile, RecurringBill } from "@/types/finance";
import { getAppDate } from "@/lib/dateUtils";

interface Props {
  initial?: RecurringBill | null;
  categories: readonly BudgetCategory[];
  profiles: readonly FinanceProfile[];
  defaultProfileId: string | null;
  onSave: (bill: Omit<RecurringBill, "id" | "user_id"> & { id?: string }) => Promise<unknown>;
  onCancel: () => void;
}

export default function RecurringBillForm({
  initial,
  categories,
  profiles,
  defaultProfileId,
  onSave,
  onCancel,
}: Readonly<Props>) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace(".", ",") : "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [profileId, setProfileId] = useState(initial?.profile_id ?? defaultProfileId ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? getAppDate());
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(
    initial ? initial.recurrence : { freq: "monthly", interval: 1, monthlyBy: "monthday" }
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number.parseFloat(amount.replace(",", "."));
    if (!name.trim() || !Number.isFinite(value)) return;
    setSaving(true);
    const saved = await onSave({
      id: initial?.id,
      name,
      amount: Math.round(value * 100) / 100,
      category_id: categoryId || null,
      profile_id: profileId || null,
      start_date: startDate,
      recurrence,
      active,
    });
    setSaving(false);
    if (saved) onCancel();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="form-card max-w-xl">
      <div>
        <label htmlFor={`${id}-name`} className="form-label">
          Nazwa:
        </label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          placeholder="np. Apple Music, Czynsz"
          required
          maxLength={120}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AmountField id={id} value={amount} onChange={setAmount} />
        <div>
          <label htmlFor={`${id}-date`} className="form-label">
            {recurrence ? "Pierwszy termin:" : "Termin:"}
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field w-full"
            required
          />
        </div>
        <CategorySelect id={id} value={categoryId} onChange={setCategoryId} categories={categories} />
        <ProfileSelect id={id} value={profileId} onChange={setProfileId} profiles={profiles} />
      </div>

      <RecurrenceEditor idPrefix={`${id}-rec`} value={recurrence} onChange={setRecurrence} startDay={startDate} />

      {initial && (
        <div className="flex items-center gap-3">
          <input
            id={`${id}-active`}
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-5 w-5"
          />
          <label htmlFor={`${id}-active`} className="cursor-pointer text-text">
            Aktywny (tworzy zadania i prognozę)
          </label>
        </div>
      )}
      <FormButtons onClickClose={onCancel} loading={saving} />
    </form>
  );
}
