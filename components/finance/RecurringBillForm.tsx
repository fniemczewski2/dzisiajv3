// components/finance/RecurringBillForm.tsx

import React, { useId, useState } from "react";
import RecurrenceEditor from "@/components/ui/RecurrenceEditor";
import { FormButtons } from "@/components/ui/CommonButtons";
import type { RecurrenceRule } from "@/supabase/functions/_shared/recurrence";
import type { BudgetCategory } from "@/types/bills";
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

export default function RecurringBillForm({ initial, categories, profiles, defaultProfileId, onSave, onCancel }: Readonly<Props>) {
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

  const submit = async (e: React.FormEvent) => {
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
        <label htmlFor={`${id}-name`} className="form-label">Nazwa:</label>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="np. Apple Music, Czynsz" required maxLength={120} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-amount`} className="form-label">Kwota (zł):</label>
          <input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field" placeholder="0,00" required />
        </div>
        <div>
          <label htmlFor={`${id}-date`} className="form-label">{recurrence ? "Pierwszy termin:" : "Termin:"}</label>
          <input id={`${id}-date`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" required />
        </div>
        <div>
          <label htmlFor={`${id}-cat`} className="form-label">Kategoria:</label>
          <select id={`${id}-cat`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field">
            <option value="">Bez kategorii</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {profiles.length > 0 && (
          <div>
            <label htmlFor={`${id}-profile`} className="form-label">Profil:</label>
            <select id={`${id}-profile`} value={profileId} onChange={(e) => setProfileId(e.target.value)} className="input-field">
              <option value="">Bez profilu</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <RecurrenceEditor idPrefix={`${id}-rec`} value={recurrence} onChange={setRecurrence} startDay={startDate} />

      {initial && (
        <div className="flex items-center gap-3">
          <input id={`${id}-active`} type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5" />
          <label htmlFor={`${id}-active`} className="cursor-pointer text-text">Aktywny (tworzy zadania i prognozę)</label>
        </div>
      )}
      <FormButtons onClickClose={onCancel} loading={saving} />
    </form>
  );
}
