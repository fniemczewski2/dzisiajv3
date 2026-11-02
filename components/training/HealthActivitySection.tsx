// components/training/HealthActivitySection.tsx
//
// Aktywność z Apple Zdrowie (Skróty iOS): ostatnie 7 dni (kroki, sen, tętno spoczynkowe) i treningi z 30 dni.

import React, { useMemo } from "react";
import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { addDays, format } from "date-fns";
import NoResultsState from "@/components/ui/NoResultsState";
import { getAppDate } from "@/lib/dateUtils";
import { useHealthConsent } from "@/hooks/useHealthConsent";
import { useHealthDays, useHealthWorkouts, type HealthDailyRow, type HealthWorkoutRow } from "@/hooks/db/useHealthData";
import { formatMinutes, formatSteps } from "@/lib/health/format";

const DAYS = 7;
const WORKOUT_DAYS = 30;

function DaysTable({ rows }: Readonly<{ rows: HealthDailyRow[] }>) {
  if (rows.length === 0)
    return <NoResultsState text="danych z ostatnich 7 dni" hint="Skrót iOS jeszcze nie przesłał danych." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Kroki, sen i tętno spoczynkowe z ostatnich 7 dni</caption>
        <thead>
          <tr className="text-left text-text-muted">
            <th scope="col" className="py-1 pr-3 font-semibold">
              Dzień
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-semibold">
              Kroki
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-semibold">
              Sen
            </th>
            <th scope="col" className="py-1 text-right font-semibold">
              Tętno
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.date} className="border-t border-line text-text tabular-nums">
              <td className="py-1.5 pr-3">{d.date}</td>
              <td className="py-1.5 pr-3 text-right">{d.steps === null ? "–" : formatSteps(d.steps)}</td>
              <td className="py-1.5 pr-3 text-right">
                {d.sleep_minutes === null ? "–" : formatMinutes(d.sleep_minutes)}
              </td>
              <td className="py-1.5 text-right">
                {d.heart_rate_resting === null ? "–" : `${d.heart_rate_resting} bpm`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkoutList({ rows }: Readonly<{ rows: HealthWorkoutRow[] }>) {
  if (rows.length === 0) return <NoResultsState text="treningów" hint="Skrót iOS nie przesłał jeszcze treningów." />;
  return (
    <ul className="space-y-2" aria-label="Treningi">
      {rows.map((w) => (
        <li key={w.id} className="card flex min-w-0 flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
          <span className="font-semibold text-text">{w.activity}</span>
          <span className="text-text-secondary tabular-nums">
            {new Date(w.started_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
            {w.duration_minutes !== null && ` · ${formatMinutes(w.duration_minutes)}`}
            {w.distance_km !== null && ` · ${String(w.distance_km).replace(".", ",")} km`}
            {w.heart_rate_avg !== null && ` · ${w.heart_rate_avg} bpm`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function HealthActivitySection() {
  const { hasConsent } = useHealthConsent();
  const today = getAppDate();
  const from = format(addDays(new Date(`${today}T12:00:00`), -(DAYS - 1)), "yyyy-MM-dd");
  const since = useMemo(() => addDays(new Date(`${today}T00:00:00`), -WORKOUT_DAYS).toISOString(), [today]);
  const days = useHealthDays(from, today);
  const workouts = useHealthWorkouts(since);

  return (
    <section aria-labelledby="health-activity-heading" className="mt-8 space-y-4">
      <h2 id="health-activity-heading" className="section-title flex items-center gap-2">
        <HeartPulse className="h-5 w-5" aria-hidden="true" /> Aktywność z Apple Zdrowie
      </h2>
      {hasConsent ? (
        <>
          <DaysTable rows={days.data ?? []} />
          <h3 className="text-sm font-semibold text-text">Treningi (ostatnie {WORKOUT_DAYS} dni)</h3>
          <WorkoutList rows={workouts.data ?? []} />
        </>
      ) : (
        <p className="text-sm text-text-secondary">
          Aby widzieć kroki, sen i treningi, udziel zgody w{" "}
          <Link href="/settings#integracje" className="text-primary underline">
            ustawieniach
          </Link>{" "}
          i skonfiguruj Skrót iOS.
        </p>
      )}
    </section>
  );
}
