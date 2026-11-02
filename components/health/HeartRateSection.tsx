// components/health/HeartRateSection.tsx
//
// Tętno z wybranego dnia: ostatni pomiar, średnia, minimum i maksimum (liczone z rejestru) oraz lista pomiarów.

import React, { useMemo, useState } from "react";
import { ChevronDown, HeartPulse } from "lucide-react";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { SecondaryFullButton } from "@/components/ui/CommonButtons";
import { HEALTH_LIST_PAGE_SIZE } from "@/config/limits";
import { summarizeHeartRate, type HeartRateRecord } from "@/lib/health/summary";
import { warsawTime } from "@/lib/health/time";
import StatTile from "./StatTile";

interface Props {
  records: HeartRateRecord[];
  loading: boolean;
  /** Podsumowanie dnia przesłane bez rejestru (starsze wysyłki) – pokazywane, gdy brak pomiarów. */
  fallback?: { avg: number | null; min: number | null; max: number | null; resting: number | null } | null;
}

const bpm = (value: number) => `${String(value).replace(".", ",")} bpm`;

function FallbackTiles({ fallback }: Readonly<{ fallback: NonNullable<Props["fallback"]> }>) {
  const items: [string, number | null][] = [
    ["Średnie", fallback.avg],
    ["Minimalne", fallback.min],
    ["Maksymalne", fallback.max],
    ["Spoczynkowe", fallback.resting],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <StatTile key={label} label={label} value={value === null ? "–" : bpm(value)} hint="Z podsumowania dnia" />
      ))}
    </dl>
  );
}

export default function HeartRateSection({ records, loading, fallback = null }: Readonly<Props>) {
  const [visible, setVisible] = useState(HEALTH_LIST_PAGE_SIZE);
  const summary = useMemo(() => summarizeHeartRate(records), [records]);
  const sorted = useMemo(
    () => [...records].sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at)),
    [records]
  );
  const hasFallback = fallback && [fallback.avg, fallback.min, fallback.max, fallback.resting].some((v) => v !== null);

  let body: React.ReactNode;
  if (loading) {
    body = <SkeletonList count={3} variant="row" />;
  } else if (!summary) {
    body = hasFallback ? (
      <FallbackTiles fallback={fallback} />
    ) : (
      <NoResultsState text="pomiarów tętna" hint="Skrót iOS nie przesłał jeszcze danych z tego dnia." />
    );
  } else {
    body = (
      <>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Aktualne"
            value={bpm(summary.latest.bpm)}
            hint={`o ${warsawTime(summary.latest.recorded_at)}`}
          />
          <StatTile label="Średnie" value={bpm(summary.avg)} />
          <StatTile label="Minimalne" value={bpm(summary.min)} />
          <StatTile label="Maksymalne" value={bpm(summary.max)} />
        </dl>
        <div className="card overflow-hidden p-0">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Pomiary tętna z wybranego dnia, od najnowszego</caption>
              <thead className="sticky top-0 bg-card">
                <tr className="text-left text-text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Godzina
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Tętno
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, visible).map((r) => (
                  <tr key={r.recorded_at} className="border-t border-line text-text tabular-nums">
                    <td className="px-3 py-1.5">{warsawTime(r.recorded_at)}</td>
                    <td className="px-3 py-1.5 text-right">{r.bpm} bpm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Pomiarów: {summary.count}. Średnia jest średnią arytmetyczną wszystkich pomiarów dnia.
        </p>
        {visible < sorted.length && (
          <SecondaryFullButton
            Icon={ChevronDown}
            onClick={() => setVisible((v) => v + HEALTH_LIST_PAGE_SIZE)}
            className="sm:w-auto"
          >
            Pokaż więcej ({sorted.length - visible})
          </SecondaryFullButton>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="heart-rate-heading" className="space-y-3">
      <h2 id="heart-rate-heading" className="section-title flex items-center gap-2">
        <HeartPulse className="h-5 w-5" aria-hidden="true" /> Tętno
      </h2>
      {body}
    </section>
  );
}
