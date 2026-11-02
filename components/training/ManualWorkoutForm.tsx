// components/training/ManualWorkoutForm.tsx
//
// Formularz własnego treningu (poza danymi ze Skrótów iOS). Walidacja w lib/health/manualWorkout.ts.

import React, { useState } from "react";
import { FormButtons } from "@/components/ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";
import {
  buildManualWorkout,
  emptyManualWorkout,
  WORKOUT_SUGGESTIONS,
  type ManualWorkoutForm as FormState,
  type ManualWorkoutRow,
} from "@/lib/health/manualWorkout";

interface Props {
  /** Domyślna data treningu (RRRR-MM-DD). */
  date: string;
  saving: boolean;
  onSubmit: (row: ManualWorkoutRow) => Promise<void>;
  onCancel: () => void;
}

export default function ManualWorkoutForm({ date, saving, onSubmit, onCancel }: Readonly<Props>) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => emptyManualWorkout(date));
  const bind = (key: keyof FormState) => ({
    value: form[key],
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildManualWorkout(form);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await onSubmit(result.row);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="form-card max-w-md" aria-label="Dodaj trening">
      <div>
        <label htmlFor="workout-activity" className="form-label">
          Rodzaj treningu:
        </label>
        <input
          id="workout-activity"
          {...bind("activity")}
          type="text"
          list="workout-suggestions"
          placeholder="np. Bieg"
          className="input-field"
        />
        <datalist id="workout-suggestions">
          {WORKOUT_SUGGESTIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </datalist>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="workout-date" className="form-label">
            Data:
          </label>
          <input id="workout-date" {...bind("date")} type="date" className="input-field" />
        </div>
        <div>
          <label htmlFor="workout-time" className="form-label">
            Godzina rozpoczęcia:
          </label>
          <input id="workout-time" {...bind("time")} type="time" className="input-field" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="workout-durationMinutes" className="form-label">
            Czas trwania (min):
          </label>
          <input
            id="workout-durationMinutes"
            {...bind("durationMinutes")}
            type="text"
            inputMode="numeric"
            placeholder="np. 45"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="workout-distanceKm" className="form-label">
            Dystans (km, opcjonalnie):
          </label>
          <input
            id="workout-distanceKm"
            {...bind("distanceKm")}
            type="text"
            inputMode="decimal"
            placeholder="np. 6,5"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="workout-energyKcal" className="form-label">
            Energia (kcal, opcjonalnie):
          </label>
          <input
            id="workout-energyKcal"
            {...bind("energyKcal")}
            type="text"
            inputMode="numeric"
            placeholder="np. 400"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="workout-avgHeartRate" className="form-label">
            Średnie tętno (bpm, opcjonalnie):
          </label>
          <input
            id="workout-avgHeartRate"
            {...bind("avgHeartRate")}
            type="text"
            inputMode="numeric"
            placeholder="np. 150"
            className="input-field"
          />
        </div>
      </div>
      <FormButtons onClickClose={onCancel} loading={saving} />
    </form>
  );
}
