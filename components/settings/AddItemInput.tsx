// components/settings/AddItemInput.tsx
//
// Reużywalne pole „dodaj pozycję” do list w ustawieniach (nastroje, nawyki,
// kategorie, osoby zaufane, profile finansowe, szablony): pole tekstowe + przycisk
// „Dodaj”. Enter dodaje pozycję i nie wysyła formularza ustawień. Po osiągnięciu
// limitu pole znika (opcjonalnie zastępuje je komunikat `limitMessage`).
//
// Komponent nie zna typu pozycji – zwraca oczyszczony tekst w `onAdd`, a rodzic
// tworzy z niego obiekt (id, ikona, kolor itd.).

import React, { useId, useRef, useState } from "react";
import { AddButton } from "@/components/ui/CommonButtons";

/** Domyślne czyszczenie: zwinięte białe znaki, przycięcie, limit długości. */
const defaultNormalize = (raw: string, maxLength?: number): string => {
  const collapsed = raw.replaceAll(/\s+/g, " ").trim();
  return maxLength ? collapsed.slice(0, maxLength) : collapsed;
};

export interface AddItemInputProps {
  /** Aktualna liczba pozycji na liście. */
  count: number;
  /** Maksymalna liczba pozycji; od `count >= max` pole jest ukryte. */
  max: number;
  /**
   * Dodaje pozycję. Zwróć `false` (także w Promise), gdy dodanie się nie udało
   * – wpisany tekst zostanie wtedy w polu. Każda inna wartość czyści pole.
   */
  onAdd: (value: string) => boolean | void | Promise<boolean | void>;
  /** Etykieta pola dla czytników ekranu, np. „Nowy nawyk”. */
  label: string;
  placeholder?: string;
  /** Dostępna nazwa przycisku, np. „Dodaj nawyk”. Domyślnie „Dodaj”. */
  addLabel?: string;
  maxLength?: number;
  type?: "text" | "email";
  /** Zwraca komunikat błędu albo null; wywoływane przed `onAdd`. */
  validate?: (value: string) => string | null;
  /** Własne czyszczenie tekstu (domyślnie: białe znaki + `maxLength`). */
  normalize?: (raw: string) => string;
  /** Komunikat pokazywany zamiast pola po osiągnięciu limitu (domyślnie nic). */
  limitMessage?: string;
  /** Wyłącza pole bez ukrywania (np. w trakcie zapisu ustawień). */
  disabled?: boolean;
  className?: string;
}

export default function AddItemInput({
  count,
  max,
  onAdd,
  label,
  placeholder,
  addLabel,
  maxLength,
  type = "text",
  validate,
  normalize,
  limitMessage,
  disabled = false,
  className = "mt-3",
}: Readonly<AddItemInputProps>) {
  const baseId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false); // blokada podwójnego dodania (Enter + kliknięcie)

  if (count >= max) {
    return limitMessage ? (
      <output className={`block ${className} text-sm text-text-secondary`}>{limitMessage}</output>
    ) : null;
  }

  const value = (normalize ?? ((raw: string) => defaultNormalize(raw, maxLength)))(draft);
  const canAdd = !disabled && !pending && value.length > 0;

  const add = async () => {
    if (!canAdd || busy.current) return;
    const validationError = validate?.(value) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const result = await onAdd(value);
      if (result !== false) {
        setDraft("");
        setError(null);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const inputId = `${baseId}-new`;
  const errorId = `${baseId}-err`;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <input
          id={inputId}
          type={type}
          value={draft}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault(); // nie wysyłaj całego formularza ustawień
              void add();
            }
          }}
          className="input-field flex-1"
        />
        <AddButton small onClick={() => void add()} disabled={!canAdd} ariaLabel={addLabel} />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
