// components/settings/CategoryColorPicker.tsx
//
// Wybór koloru kategorii z zamkniętej palety. Przycisk-próbka otwiera grupę
// przycisków radiowych (natywne <input type="radio">, więc strzałki,
// Tab i czytniki ekranu działają bez dodatkowego kodu). Wybór zapisuje się
// od razu; panel zamyka „Gotowe”, Escape albo kliknięcie obok. Nie zamykamy
// go po zmianie zaznaczenia, bo strzałki też zmieniają zaznaczenie.

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { CATEGORY_PALETTE, paletteColorName } from "@/lib/categoryColors";

interface Props {
  categoryName: string;
  value: string | null;
  onChange: (color: string | null) => void;
  /** Co jest kolorowane – do etykiet czytnika ekranu (domyślnie „kategorii”). */
  subject?: string;
  /** Czy pokazać opcję „bez koloru”. */
  allowNone?: boolean;
}

export default function CategoryColorPicker({
  categoryName,
  value,
  onChange,
  subject = "kategorii",
  allowNone = true,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const groupId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLFieldSetElement>(null);
  const colorName = paletteColorName(value);

  useEffect(() => {
    if (!open) return;
    // Fokus na zaznaczonej opcji (albo pierwszej), żeby od razu działały strzałki.
    const checked =
      panelRef.current?.querySelector<HTMLInputElement>("input:checked") ??
      panelRef.current?.querySelector<HTMLInputElement>("input");
    checked?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    // Escape zamyka panel i oddaje fokus przyciskowi (nasłuch na dokumencie,
    // bo fieldset nie jest elementem interaktywnym).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={groupId}
        aria-label={`Kolor ${subject} ${categoryName}: ${colorName ?? "brak"}. Zmień`}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-input bg-card transition-colors hover:bg-surface"
      >
        {value ? (
          <span aria-hidden="true" className="h-6 w-6 rounded-full" style={{ backgroundColor: value }} />
        ) : (
          <span aria-hidden="true" className="h-6 w-6 rounded-full border-2 border-dashed border-input" />
        )}
      </button>

      {open && (
        <fieldset
          id={groupId}
          ref={panelRef}
          className="absolute right-0 z-30 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-xl border border-line-strong bg-card p-3 shadow-lg"
        >
          <legend className="sr-only">
            Kolor {subject} {categoryName}
          </legend>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORY_PALETTE.map((c) => (
              <label
                key={c.value}
                className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full"
                title={c.name}
              >
                <input
                  type="radio"
                  name={`${groupId}-color`}
                  value={c.value}
                  checked={value?.toUpperCase() === c.value.toUpperCase()}
                  onChange={() => onChange(c.value)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-text peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
                  style={{ backgroundColor: c.value }}
                >
                  {value?.toUpperCase() === c.value.toUpperCase() && <Check className="h-4 w-4 text-white" />}
                </span>
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </div>
          {allowNone && (
            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-text-secondary hover:bg-surface">
              <input
                type="radio"
                name={`${groupId}-color`}
                value=""
                checked={!value}
                onChange={() => onChange(null)}
                className="h-5 w-5"
              />
              <X className="h-4 w-4" aria-hidden="true" />
              Bez koloru
            </label>
          )}
          <button
            type="button"
            onClick={close}
            className="mt-2 min-h-11 w-full rounded-lg bg-secondary text-sm font-semibold text-white hover:bg-secondary-hover"
          >
            Gotowe
          </button>
        </fieldset>
      )}
    </div>
  );
}
