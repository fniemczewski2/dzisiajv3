// components/finance/ProfileSwitcher.tsx
//
// Wybór profilu finansowego (konto osobiste, firmowe, wspólne…). „Wszystkie”
// pokazuje dane ze wszystkich profili; pozycje bez profilu widać tylko tam.

import React from "react";
import type { FinanceProfile } from "@/types/finance";

interface Props {
  profiles: readonly FinanceProfile[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export default function ProfileSwitcher({ profiles, value, onChange }: Readonly<Props>) {
  if (profiles.length === 0) return null;
  const chip = (label: string, id: string | null, color?: string | null) => {
    const active = value === id;
    return (
      <li key={id ?? "all"} className="shrink-0">
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onChange(id)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
            active ? "border-text bg-text text-card" : "border-line-strong bg-card text-text-secondary hover:text-text"
          }`}
        >
          {color && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
          {label}
        </button>
      </li>
    );
  };
  return (
    <fieldset className="min-w-0 -mx-3 mb-4 sm:mx-0">
      <legend className="sr-only">Profil finansowy</legend>
      <ul className="flex gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:px-0">
        {chip("Wszystkie", null)}
        {profiles.map((p) => chip(p.name, p.id, p.color))}
      </ul>
    </fieldset>
  );
}
