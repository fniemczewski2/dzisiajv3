// components/settings/TaskCategoriesEditor.tsx
//
// Edycja własnych kategorii zadań. Zmiany trafiają do formularza ustawień
// i zapisują się razem z nim (przycisk „Zapisz”).

import React, { useEffect, useId, useRef, useState } from "react";
import { Lock, PlusCircle, RotateCcw } from "lucide-react";
import { DeleteButton } from "@/components/ui/CommonButtons";
import {
  DEFAULT_USER_TASK_CATEGORIES,
  MAX_TASK_CATEGORIES,
  MAX_TASK_CATEGORY_LENGTH,
  SYSTEM_TASK_CATEGORIES,
  normalizeTaskCategoryName,
  resolveUserTaskCategories,
  validateTaskCategoryName,
} from "@/lib/taskCategories";

interface Row {
  id: number;
  /** Nazwa zapisana w bazie (null = kategoria dodana w tej edycji). */
  original: string | null;
  name: string;
}

const SYSTEM_HINTS: Record<string, string> = {
  cykliczne: "powtarzanie zadań",
  slack: "synchronizacja ze Slackiem",
  terminy: "ankiety terminów",
};

interface Props {
  /** Zapisane kategorie (null = domyślne). */
  value: string[] | null | undefined;
  /** Poprawna lista do zapisu; null = domyślne. */
  onChange: (next: string[] | null) => void;
  /** Zmiany nazw istniejących kategorii [stara, nowa] – do przeniesienia zadań. */
  onRenamesChange: (renames: Array<[string, string]>) => void;
}

let nextId = 1;
const toRows = (names: readonly string[]): Row[] => names.map((name) => ({ id: nextId++, original: name, name }));

function rowError(rows: readonly Row[], index: number): string | null {
  const others = rows.filter((_, i) => i !== index).map((r) => normalizeTaskCategoryName(r.name));
  return validateTaskCategoryName(rows[index].name, others);
}

export default function TaskCategoriesEditor({ value, onChange, onRenamesChange }: Readonly<Props>) {
  const baseId = useId();
  const [rows, setRows] = useState<Row[]>(() => toRows(resolveUserTaskCategories(value)));
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const lastEmitted = useRef<string | null>(null);

  // Wartość z zewnątrz (np. wczytane ustawienia) – tylko jeśli to nie nasza własna zmiana.
  useEffect(() => {
    const key = JSON.stringify(value ?? null);
    if (key !== lastEmitted.current) setRows(toRows(resolveUserTaskCategories(value)));
  }, [value]);

  const emit = (next: Row[]) => {
    setRows(next);
    const valid = next.every((_, i) => rowError(next, i) === null);
    if (!valid) return; // błędną listę pokazujemy, ale jej nie zapisujemy
    const names = next.map((r) => normalizeTaskCategoryName(r.name));
    const isDefault =
      names.length === DEFAULT_USER_TASK_CATEGORIES.length && names.every((n, i) => n === DEFAULT_USER_TASK_CATEGORIES[i]);
    const stored = isDefault ? null : names;
    lastEmitted.current = JSON.stringify(stored);
    onChange(stored);
    onRenamesChange(
      next
        .filter((r) => r.original !== null && r.original !== normalizeTaskCategoryName(r.name))
        .map((r) => [r.original as string, normalizeTaskCategoryName(r.name)])
    );
  };

  const addCategory = () => {
    const error = validateTaskCategoryName(draft, rows.map((r) => r.name));
    if (error) {
      setDraftError(error);
      return;
    }
    emit([...rows, { id: nextId++, original: null, name: normalizeTaskCategoryName(draft) }]);
    setDraft("");
    setDraftError(null);
  };

  const atLimit = rows.length >= MAX_TASK_CATEGORIES;

  return (
    <div className="mt-2 p-4 bg-surface border border-gray-100 dark:border-gray-800 rounded-xl">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-xs font-bold text-text-muted">Kategorie zadań</h4>
        <span className="text-xs text-text-muted">
          {rows.length}/{MAX_TASK_CATEGORIES}
        </span>
      </div>
      <p className="text-xs text-text-secondary mb-3">
        Zmiana nazwy przenosi też istniejące zadania. Zadania z usuniętej kategorii ją zachowują.
      </p>

      <ul className="space-y-2">
        {rows.map((row, index) => {
          const error = rowError(rows, index);
          const errorId = `${baseId}-err-${row.id}`;
          return (
            <li key={row.id}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.name}
                  maxLength={MAX_TASK_CATEGORY_LENGTH + 10}
                  aria-label={`Nazwa kategorii ${index + 1}`}
                  aria-invalid={error !== null}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(e) => emit(rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))}
                  className="input-field flex-1"
                />
                <DeleteButton
                  small
                  disabled={rows.length <= 1}
                  ariaLabel={`Usuń kategorię ${row.name}`}
                  onClick={() => emit(rows.filter((r) => r.id !== row.id))}
                />
              </div>
              {error && (
                <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-start gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={draft}
            placeholder={atLimit ? `Limit ${MAX_TASK_CATEGORIES} kategorii` : "Nowa kategoria"}
            aria-label="Nowa kategoria"
            aria-invalid={draftError !== null}
            aria-describedby={draftError ? `${baseId}-draft-err` : undefined}
            disabled={atLimit}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // nie wysyłaj całego formularza ustawień
                addCategory();
              }
            }}
            className="input-field w-full"
          />
          {draftError && (
            <p id={`${baseId}-draft-err`} className="mt-1 text-xs text-red-600 dark:text-red-400">
              {draftError}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addCategory}
          disabled={atLimit || !draft.trim()}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong transition-colors p-2 disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" /> Dodaj
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-line">
        <p className="text-xs font-semibold text-text-secondary mb-2">Kategorie systemowe – zawsze dostępne</p>
        <ul className="flex flex-wrap gap-2">
          {SYSTEM_TASK_CATEGORIES.map((name) => (
            <li
              key={name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line bg-card text-xs text-text-secondary"
            >
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span className="font-medium text-text">{name}</span>
              {SYSTEM_HINTS[name] && <span>– {SYSTEM_HINTS[name]}</span>}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => {
          setDraft("");
          setDraftError(null);
          emit(toRows(DEFAULT_USER_TASK_CATEGORIES));
        }}
        className="mt-3 flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text transition-colors p-2"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Przywróć domyślne
      </button>
    </div>
  );
}
