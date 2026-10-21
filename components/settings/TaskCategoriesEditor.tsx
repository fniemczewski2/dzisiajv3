// components/settings/TaskCategoriesEditor.tsx
//
// Edycja własnych kategorii (zadań i wydarzeń) wraz z kolorami. Zmiany trafiają
// do formularza ustawień i zapisują się razem z nim (przycisk „Zapisz”).
// Kolor jest przypięty do wiersza, więc zmiana nazwy go nie gubi.

import React, { useId, useState } from "react";
import { Lock, RotateCcw } from "lucide-react";
import { DeleteButton } from "@/components/ui/CommonButtons";
import CategoryColorPicker from "./CategoryColorPicker";
import {
  DEFAULT_USER_TASK_CATEGORIES,
  MAX_TASK_CATEGORIES,
  MAX_TASK_CATEGORY_LENGTH,
  SYSTEM_TASK_CATEGORIES,
  normalizeTaskCategoryName,
  resolveUserTaskCategories,
  validateTaskCategoryName,
} from "@/lib/taskCategories";
import AddItemInput from "./AddItemInput";

interface Row {
  id: number;
  /** Nazwa zapisana w bazie (null = kategoria dodana w tej edycji). */
  original: string | null;
  name: string;
  color: string | null;
}

const SYSTEM_HINTS: Record<string, string> = {
  terminy: "ankiety terminów",
};

interface Props {
  /** Zapisane kategorie (null = domyślne). */
  value: string[] | null | undefined;
  /** Poprawna lista do zapisu; null = domyślne. */
  onChange: (next: string[] | null) => void;
  /** Zmiany nazw istniejących kategorii [stara, nowa] – do przeniesienia zadań. */
  onRenamesChange: (renames: Array<[string, string]>) => void;
  /** Zapisane kolory (nazwa → kolor). */
  colors?: Record<string, string> | null;
  /** Kolory do zapisu; null = brak kolorów. */
  onColorsChange?: (next: Record<string, string> | null) => void;
}

let nextId = 1;
const toRows = (names: readonly string[], colors?: Record<string, string> | null): Row[] =>
  names.map((name) => ({ id: nextId++, original: name, name, color: colors?.[name] ?? null }));

function rowError(rows: readonly Row[], index: number): string | null {
  const others = rows.filter((_, i) => i !== index).map((r) => normalizeTaskCategoryName(r.name));
  return validateTaskCategoryName(rows[index].name, others);
}

export default function TaskCategoriesEditor({
  value,
  onChange,
  onRenamesChange,
  colors,
  onColorsChange,
}: Readonly<Props>) {
  const baseId = useId();
  const [rows, setRows] = useState<Row[]>(() => toRows(resolveUserTaskCategories(value), colors));
  const [lastEmitted, setLastEmitted] = useState<string | null>(null);

  // Wartość z zewnątrz (np. wczytane ustawienia) – tylko jeśli to nie nasza własna zmiana.
  // Kolory czytamy tylko przy wczytaniu listy z zewnątrz; dalej są w wierszach.
  // Aktualizacja w trakcie renderu (wzorzec React „stan zależny od propsów”) zamiast efektu.
  const valueKey = JSON.stringify(value ?? null);
  const [seenValueKey, setSeenValueKey] = useState(valueKey);
  if (seenValueKey !== valueKey) {
    setSeenValueKey(valueKey);
    if (valueKey !== lastEmitted) setRows(toRows(resolveUserTaskCategories(value), colors));
  }

  // Ustawienia wczytały się później niż komponent – dociągnij kolory do wierszy bez koloru.
  const colorsKey = JSON.stringify(colors ?? null);
  const [seenColorsKey, setSeenColorsKey] = useState(colorsKey);
  if (seenColorsKey !== colorsKey) {
    setSeenColorsKey(colorsKey);
    if (colors) {
      setRows((prev) =>
        prev.map((r) =>
          r.color === null && r.original && colors[r.original] ? { ...r, color: colors[r.original] } : r
        )
      );
    }
  }

  const emit = (next: Row[]) => {
    setRows(next);
    const valid = next.every((_, i) => rowError(next, i) === null);
    if (!valid) return; // błędną listę pokazujemy, ale jej nie zapisujemy
    const names = next.map((r) => normalizeTaskCategoryName(r.name));
    const isDefault =
      names.length === DEFAULT_USER_TASK_CATEGORIES.length &&
      names.every((n, i) => n === DEFAULT_USER_TASK_CATEGORIES[i]);
    const stored = isDefault ? null : names;
    setLastEmitted(JSON.stringify(stored));
    onChange(stored);
    const colorMap: Record<string, string> = {};
    next.forEach((r) => {
      if (r.color) colorMap[normalizeTaskCategoryName(r.name)] = r.color;
    });
    onColorsChange?.(Object.keys(colorMap).length > 0 ? colorMap : null);
    onRenamesChange(
      next
        .filter((r) => r.original !== null && r.original !== normalizeTaskCategoryName(r.name))
        .map((r) => [r.original as string, normalizeTaskCategoryName(r.name)])
    );
  };

  return (
    <fieldset className="min-w-0 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-text">
        Kategorie&nbsp;{rows.length}/{MAX_TASK_CATEGORIES}
      </legend>
      <p className="mb-3 text-xs text-text-secondary">
        Zmiana nazwy przenosi istniejące, zadania i wydarzenia z usuniętej kategorii zachowują ją.
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
                <CategoryColorPicker
                  categoryName={row.name || `nr ${index + 1}`}
                  value={row.color}
                  onChange={(color) => emit(rows.map((r) => (r.id === row.id ? { ...r, color } : r)))}
                />
                <DeleteButton
                  small
                  disabled={rows.length <= 1}
                  ariaLabel={`Usuń kategorię ${row.name}`}
                  onClick={() => emit(rows.filter((r) => r.id !== row.id))}
                />
              </div>
              {error && (
                <p id={errorId} className="mt-1 text-xs text-danger">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <AddItemInput
        count={rows.length}
        max={MAX_TASK_CATEGORIES}
        label="Nowa kategoria"
        validate={(name) =>
          validateTaskCategoryName(
            name,
            rows.map((r) => r.name)
          )
        }
        onAdd={(name) => emit([...rows, { id: nextId++, original: null, name, color: null }])}
      />

      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-xs font-semibold text-text-secondary">Kategorie systemowe – zawsze dostępne</p>
        <ul className="flex flex-wrap gap-2">
          {SYSTEM_TASK_CATEGORIES.map((name) => (
            <li
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs text-text-secondary"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              <span className="font-medium text-text">{name}</span>
              {SYSTEM_HINTS[name] && <span>– {SYSTEM_HINTS[name]}</span>}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => {
          emit(toRows(DEFAULT_USER_TASK_CATEGORIES, null));
        }}
        className="mt-3 flex items-center gap-2 p-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Przywróć domyślne
      </button>
    </fieldset>
  );
}
