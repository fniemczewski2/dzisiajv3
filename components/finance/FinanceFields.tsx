// components/finance/FinanceFields.tsx
//
// Pola wspólne formularzy transakcji i płatności cyklicznych.

import type { BudgetCategory } from "@/types/bills";
import type { FinanceProfile } from "@/types/finance";

export function AmountField({
  id,
  value,
  onChange,
}: Readonly<{ id: string; value: string; onChange: (v: string) => void }>) {
  return (
    <div>
      <label htmlFor={`${id}-amount`} className="form-label">
        Kwota (zł):
      </label>
      <input
        id={`${id}-amount`}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        placeholder="0,00"
        required
      />
    </div>
  );
}

export function CategorySelect({
  id,
  value,
  onChange,
  categories,
  emptyLabel = "Bez kategorii",
}: Readonly<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  categories: readonly BudgetCategory[];
  emptyLabel?: string;
}>) {
  return (
    <div>
      <label htmlFor={`${id}-cat`} className="form-label">
        Kategoria:
      </label>
      <select id={`${id}-cat`} value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        <option value="">{emptyLabel}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Wybór profilu finansowego – pokazywany tylko, gdy użytkownik ma profile. */
export function ProfileSelect({
  id,
  value,
  onChange,
  profiles,
}: Readonly<{ id: string; value: string; onChange: (v: string) => void; profiles: readonly FinanceProfile[] }>) {
  if (profiles.length === 0) return null;
  return (
    <div>
      <label htmlFor={`${id}-profile`} className="form-label">
        Profil:
      </label>
      <select id={`${id}-profile`} value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        <option value="">Bez profilu</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
