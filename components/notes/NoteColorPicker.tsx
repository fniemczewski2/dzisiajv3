// components/notes/NoteColorPicker.tsx
//
// Wybór koloru tła notatki: grupa przycisków radiowych (natywne input
// type="radio" – strzałki, Tab i czytniki ekranu działają bez dodatkowego kodu).

import { useId } from "react";
import clsx from "clsx";
import { NOTE_COLORS } from "@/config/noteColors";

interface Props {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}

export default function NoteColorPicker({ value, onChange, disabled = false }: Readonly<Props>) {
  const name = useId();
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="form-label">Kolor tła</legend>
      <div className="flex flex-wrap gap-2">
        {NOTE_COLORS.map((color) => (
          <label key={color.key} className="relative flex h-11 w-11 cursor-pointer items-center justify-center">
            <input
              type="radio"
              name={name}
              value={color.key}
              checked={value === color.key}
              onChange={() => onChange(color.key)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={clsx(
                "h-8 w-8 rounded-full border-2 transition-shadow peer-checked:ring-2 peer-checked:ring-text peer-checked:ring-offset-2 peer-checked:ring-offset-card peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
                color.className
              )}
            />
            <span className="sr-only">{color.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
