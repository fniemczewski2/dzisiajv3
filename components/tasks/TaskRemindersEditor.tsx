// components/tasks/TaskRemindersEditor.tsx
//
// Do 5 przypomnień push o zadaniu, każde z własną datą i godziną.
// Szybkie wybory („Jutro 9:00”, „Dzień przed”) oszczędzają przewijania
// natywnego pola daty na telefonie.

import React, { useId, useMemo } from "react";
import { Bell, Plus, X } from "lucide-react";
import { MAX_TASK_REMINDERS, reminderPresets, toLocalInput, validateReminders } from "@/lib/taskReminders";
import { addHours } from "date-fns";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** Termin zadania (yyyy-MM-dd) – do podpowiedzi „dzień przed”. */
  dueDate?: string | null;
  disabled?: boolean;
  /** Pokaż błąd walidacji (po próbie zapisu). */
  showErrors?: boolean;
}

export default function TaskRemindersEditor({ value, onChange, dueDate, disabled, showErrors = true }: Readonly<Props>) {
  const baseId = useId();
  const atLimit = value.length >= MAX_TASK_REMINDERS;
  // Presety liczymy przy renderze – „teraz” zmienia się, ale minuta dokładności wystarczy.
  const presets = useMemo(() => reminderPresets(new Date(), dueDate), [dueDate]);
  const error = showErrors ? validateReminders(value) : null;
  const errorId = `${baseId}-error`;

  const add = (v: string) => {
    if (atLimit || value.includes(v)) return;
    onChange([...value, v].sort());
  };

  return (
    <fieldset className="rounded-lg border border-line p-3" disabled={disabled} aria-describedby={error ? errorId : undefined}>
      <legend className="flex items-center gap-2 px-1 text-sm font-medium text-text-secondary">
        <Bell className="h-4 w-4" aria-hidden="true" />
        Przypomnienia ({value.length}/{MAX_TASK_REMINDERS})
      </legend>

      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((v, i) => (
            <li key={`${i}-${v}`} className="flex items-center gap-2">
              <label htmlFor={`${baseId}-r${i}`} className="sr-only">Przypomnienie {i + 1}</label>
              <input
                id={`${baseId}-r${i}`}
                type="datetime-local"
                value={v}
                min={toLocalInput(new Date())}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
                className="input-field flex-1 min-w-0 px-2"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Usuń przypomnienie ${i + 1}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {atLimit ? (
        <p className="text-sm text-text-secondary">Osiągnięto limit {MAX_TASK_REMINDERS} przypomnień.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => add(p.value)}
              disabled={value.includes(p.value)}
              className="min-h-11 rounded-full border border-line-strong px-3 text-sm text-text-secondary hover:border-text-muted hover:text-text disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => add(toLocalInput(addHours(new Date(), 2)))}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-sm font-medium text-text hover:border-text-muted"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Własna godzina
          </button>
        </div>
      )}

      {error && value.length > 0 && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </fieldset>
  );
}
