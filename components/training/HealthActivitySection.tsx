// components/training/HealthActivitySection.tsx
//
// Aktywność: kroki z ostatnich 7 dni (Skróty iOS) i treningi z 30 dni – ze Skrótów oraz dodane ręcznie.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Footprints } from "lucide-react";
import { addDays, format } from "date-fns";
import NoResultsState from "@/components/ui/NoResultsState";
import { AddButton, DeleteButton } from "@/components/ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";
import { getAppDate } from "@/lib/dateUtils";
import { useHealthConsent } from "@/hooks/useHealthConsent";
import {
  useHealthDays,
  useHealthWorkouts,
  useWorkoutMutations,
  type HealthDailyRow,
  type HealthWorkoutRow,
} from "@/hooks/db/useHealthData";
import { formatMinutes, formatSteps } from "@/lib/health/format";
import ManualWorkoutForm from "./ManualWorkoutForm";

const DAYS = 7;
const WORKOUT_DAYS = 30;

function saveErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  if (code === "23505") return "Taki trening już istnieje (ten sam rodzaj i godzina rozpoczęcia).";
  if (code === "42501") return "Brak zgody lub uprawnień do zapisu treningu.";
  return "Nie udało się dodać treningu.";
}

function StepsTable({ rows }: Readonly<{ rows: HealthDailyRow[] }>) {
  const withSteps = rows.filter((d) => d.steps !== null);
  if (withSteps.length === 0)
    return <NoResultsState text="kroków z ostatnich 7 dni" hint="Skrót iOS jeszcze nie przesłał danych." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Kroki z ostatnich 7 dni</caption>
        <thead>
          <tr className="text-left text-text-muted">
            <th scope="col" className="py-1 pr-3 font-semibold">
              Dzień
            </th>
            <th scope="col" className="py-1 text-right font-semibold">
              Kroki
            </th>
          </tr>
        </thead>
        <tbody>
          {withSteps.map((d) => (
            <tr key={d.date} className="border-t border-line text-text tabular-nums">
              <td className="py-1.5 pr-3">{d.date}</td>
              <td className="py-1.5 text-right">{formatSteps(d.steps as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkoutList({
  rows,
  onDelete,
}: Readonly<{ rows: HealthWorkoutRow[]; onDelete: (w: HealthWorkoutRow) => void }>) {
  if (rows.length === 0)
    return <NoResultsState text="treningów" hint="Dodaj własny trening albo wyślij go ze Skrótu iOS." />;
  return (
    <ul className="space-y-2" aria-label="Treningi">
      {rows.map((w) => (
        <li key={w.id} className="card flex min-w-0 items-center justify-between gap-2 p-3 text-sm">
          <div className="min-w-0">
            <p className="font-semibold text-text">
              {w.activity}
              {w.source === "manual" && <span className="ml-2 text-xs font-normal text-text-muted">ręcznie</span>}
            </p>
            <p className="text-text-secondary tabular-nums">
              {new Date(w.started_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
              {w.duration_minutes !== null && ` · ${formatMinutes(w.duration_minutes)}`}
              {w.distance_km !== null && ` · ${String(w.distance_km).replace(".", ",")} km`}
              {w.energy_kcal !== null && ` · ${w.energy_kcal} kcal`}
              {w.heart_rate_avg !== null && ` · ${w.heart_rate_avg} bpm`}
            </p>
          </div>
          <DeleteButton onClick={() => onDelete(w)} small ariaLabel={`Usuń trening ${w.activity}`} />
        </li>
      ))}
    </ul>
  );
}

export default function HealthActivitySection() {
  const { hasConsent } = useHealthConsent();
  const { toast } = useToast();
  const { addWorkout, removeWorkout, saving } = useWorkoutMutations();
  const [showForm, setShowForm] = useState(false);
  const today = getAppDate();
  const from = format(addDays(new Date(`${today}T12:00:00`), -(DAYS - 1)), "yyyy-MM-dd");
  const since = useMemo(() => addDays(new Date(`${today}T00:00:00`), -WORKOUT_DAYS).toISOString(), [today]);
  const days = useHealthDays(from, today);
  const workouts = useHealthWorkouts(since);

  const save = async (row: Parameters<typeof addWorkout>[0]) => {
    try {
      await addWorkout(row);
      toast.success("Dodano trening.");
      setShowForm(false);
    } catch (err) {
      toast.error(saveErrorMessage(err), { cause: err });
    }
  };

  const remove = async (w: HealthWorkoutRow) => {
    const ok = await toast.confirm(`Usunąć trening „${w.activity}”?`, { confirmLabel: "Usuń", cancelLabel: "Anuluj" });
    if (!ok) return;
    try {
      await removeWorkout(w.id);
      toast.success("Usunięto trening.");
    } catch (err) {
      toast.error("Nie udało się usunąć treningu.", { cause: err });
    }
  };

  return (
    <section aria-labelledby="health-activity-heading" className="mt-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="health-activity-heading" className="section-title flex items-center gap-2">
          <Footprints className="h-5 w-5" aria-hidden="true" /> Aktywność
        </h2>
        {hasConsent && !showForm && <AddButton onClick={() => setShowForm(true)} ariaLabel="Dodaj trening" />}
      </div>
      {hasConsent ? (
        <>
          {showForm && (
            <ManualWorkoutForm date={today} saving={saving} onSubmit={save} onCancel={() => setShowForm(false)} />
          )}
          <StepsTable rows={days.data ?? []} />
          <h3 className="text-sm font-semibold text-text">Treningi (ostatnie {WORKOUT_DAYS} dni)</h3>
          <WorkoutList rows={workouts.data ?? []} onDelete={(w) => void remove(w)} />
        </>
      ) : (
        <p className="text-sm text-text-secondary">
          Aby widzieć kroki i treningi oraz dodawać własne, udziel zgody w{" "}
          <Link href="/settings#integracje" className="text-primary underline">
            ustawieniach
          </Link>{" "}
          i skonfiguruj Skrót iOS.
        </p>
      )}
    </section>
  );
}
