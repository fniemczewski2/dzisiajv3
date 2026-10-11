// components/dashboard/DaySchemaSwitcher.tsx
//
// Przełącznik schematu na planie dnia. Pokazuje, który schemat obowiązuje
// i pozwala wybrać inny tylko na ten dzień (albo dzień bez schematu).

import React, { useId } from "react";
import { Logs } from "lucide-react";
import type { Schema } from "@/types/schemas";
import type { SchemaChoice } from "@/lib/daySchemas";
import { defaultSchemaFor, schemasForWeekday } from "@/lib/daySchemas";
import type { SchemaChoiceInput } from "@/hooks/db/useDaySchemaChoice";

interface Props {
  schemas: Schema[];
  weekday: number;
  choice: SchemaChoice;
  onChange: (value: SchemaChoiceInput) => void;
  disabled?: boolean;
}

export default function DaySchemaSwitcher({ schemas, weekday, choice, onChange, disabled }: Readonly<Props>) {
  const id = useId();
  if (schemas.length === 0) return null;

  const fallback = defaultSchemaFor(schemas, weekday);
  const forDay = schemasForWeekday(schemas, weekday);
  const others = schemas.filter((s) => !forDay.includes(s));
  let value = "default";
  if (choice === null) value = "none";
  else if (typeof choice === "string" && schemas.some((s) => s.id === choice)) value = choice;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Logs className="h-5 w-5 text-text-secondary" aria-hidden="true" />
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">Schemat dnia:</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-auto min-w-48 flex-1 sm:flex-none"
      >
        <option value="default">{fallback ? `${fallback.name} (domyślny)` : "Domyślny – brak schematu"}</option>
        {forDay.filter((s) => s.id !== fallback?.id).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
        {others.length > 0 && (
          <optgroup label="Inne schematy">
            {others.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </optgroup>
        )}
        <option value="none">Bez schematu</option>
      </select>
    </div>
  );
}
