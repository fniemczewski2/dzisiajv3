// components/calendar/EventCategorySelect.tsx
//
// Opcjonalna kategoria wydarzenia – ta sama lista, co w zadaniach. Obok pola
// próbka koloru, żeby od razu było widać, jak wydarzenie wyjdzie w kalendarzu.

import React from "react";
import { useCategoryColors, useTaskCategories } from "@/hooks/useTaskCategories";
import { paletteColorName } from "@/lib/categoryColors";

interface Props {
  id: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export default function EventCategorySelect({ id, value, onChange, disabled }: Readonly<Props>) {
  const categories = useTaskCategories();
  const colors = useCategoryColors();
  const options = value && !categories.includes(value) ? [...categories, value] : categories;
  const color = value ? colors[value] : undefined;
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id} className="form-label">
        Kategoria:
      </label>
      <div className="flex items-center gap-2">
        <select
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          aria-describedby={color ? hintId : undefined}
          className="input-field flex-1"
          disabled={disabled}
        >
          <option value="">Bez kategorii</option>
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="h-6 w-6 shrink-0 rounded-full border border-line-strong"
          style={{ backgroundColor: color ?? "transparent" }}
        />
        {color && (
          <span id={hintId} className="sr-only">
            Kolor: {paletteColorName(color)}
          </span>
        )}
      </div>
    </div>
  );
}
