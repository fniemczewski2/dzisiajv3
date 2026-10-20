// components/settings/HabitsEditor.tsx
//
// Własne nawyki: do 8 pozycji, każda z nazwą i ikoną. Zmiany trafiają do
// formularza ustawień i zapisują się przyciskiem „Zapisz”. Usunięcie nawyku
// nie kasuje historii – po ponownym dodaniu tego samego (domyślnego) nawyku
// odhaczenia wracają.

import React, { useId, useState } from "react";
import { ArrowDown, ArrowUp, PlusCircle, RotateCcw } from "lucide-react";
import { DeleteButton } from "@/components/ui/CommonButtons";
import type { HabitDef } from "@/types/habits";
import { HABIT_ICON_NAMES, LEGACY_HABITS, MAX_HABIT_LABEL, newHabitId } from "@/lib/habits";
import { MAX_HABITS } from "@/config/limits";
import { habitIcon } from "@/components/widgets/habitIconMap";

interface Props {
  value: HabitDef[];
  onChange: (next: HabitDef[]) => void;
}

export default function HabitsEditor({ value, onChange }: Readonly<Props>) {
  const baseId = useId();
  const [draft, setDraft] = useState("");
  const atLimit = value.length >= MAX_HABITS;

  const update = (id: string, patch: Partial<HabitDef>) =>
    onChange(value.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = () => {
    const label = draft.replaceAll(/\s+/g, " ").trim().slice(0, MAX_HABIT_LABEL);
    if (!label || atLimit) return;
    onChange([...value, { id: newHabitId(), label, icon: "Sparkles" }]);
    setDraft("");
  };

  return (
    <div className="mt-2 rounded-xl border border-line p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-text">Twoje nawyki</h4>
        <span className="text-sm text-text-secondary tabular-nums">
          {value.length}/{MAX_HABITS}
        </span>
      </div>
      <p className="mb-3 text-sm text-text-secondary">
        Nazwa i ikona pojawią się na planie dnia. Usunięcie nawyku nie kasuje historii.
      </p>

      <ul className="space-y-2">
        {value.map((habit, index) => {
          const Icon = habitIcon(habit.icon);
          return (
            <li key={habit.id} className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line"
              >
                <Icon className="h-5 w-5" />
              </span>
              <label htmlFor={`${baseId}-label-${habit.id}`} className="sr-only">
                Nazwa nawyku {index + 1}
              </label>
              <input
                id={`${baseId}-label-${habit.id}`}
                type="text"
                value={habit.label}
                maxLength={MAX_HABIT_LABEL}
                onChange={(e) => update(habit.id, { label: e.target.value })}
                className="input-field min-w-32 flex-1"
                required
              />
              <label htmlFor={`${baseId}-icon-${habit.id}`} className="sr-only">
                Ikona nawyku {habit.label}
              </label>
              <select
                id={`${baseId}-icon-${habit.id}`}
                value={habit.icon}
                onChange={(e) => update(habit.id, { icon: e.target.value })}
                className="input-field w-auto"
              >
                {Object.entries(HABIT_ICON_NAMES).map(([name, plName]) => (
                  <option key={name} value={name}>
                    {plName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Przesuń „${habit.label}” wyżej`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
                aria-label={`Przesuń „${habit.label}” niżej`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface disabled:opacity-40"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <DeleteButton
                small
                ariaLabel={`Usuń nawyk ${habit.label}`}
                onClick={() => onChange(value.filter((h) => h.id !== habit.id))}
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor={`${baseId}-new`} className="sr-only">
          Nowy nawyk
        </label>
        <input
          id={`${baseId}-new`}
          type="text"
          value={draft}
          maxLength={MAX_HABIT_LABEL}
          disabled={atLimit}
          placeholder={atLimit ? `Limit ${MAX_HABITS} nawyków` : "Nowy nawyk, np. Spacer"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // nie wysyłaj całego formularza ustawień
              add();
            }
          }}
          className="input-field flex-1"
        />
        <button
          type="button"
          onClick={add}
          disabled={atLimit || !draft.trim()}
          className="flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-primary hover:text-primary-strong disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" /> Dodaj
        </button>
      </div>

      <button
        type="button"
        onClick={() => onChange(LEGACY_HABITS.map((h) => ({ ...h })))}
        className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Przywróć domyślne nawyki
      </button>
    </div>
  );
}
