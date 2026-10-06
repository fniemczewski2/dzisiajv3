// components/dashboard/TrainPlanItem.tsx

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, TrainFront } from "lucide-react";
import { useTrainPlanStatus } from "@/hooks/db/useTrains";
import type { TrackedTrain } from "@/types/transport";
import { actionButton } from "../ui/CommonButtons";
import {
  cleanValue,
  expectedDeparture,
  formatHm,
  isStatusRelevant,
  plannedDeparture,
} from "@/lib/trainPlan";

const STATUS_REFRESH_MS = 120_000;

function Detail({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="flex items-end justify-center min-w-0">
      <span className="text-[10px] text-text-muted">{label}:&nbsp;</span>
      <span className={`text-sm font-bold tabular-nums truncate ${value ? "text-text" : "text-text-muted"}`}>{value ?? "–"}</span>
    </div>
  );
}

type Badge = { text: string; cls: string };

const ON_TIME_BADGE_CLASS = "bg-emerald-600 text-white";

function statusBadge(o: { cancelled: boolean; delayed: boolean; delay: number; onTime: boolean }): Badge {
  if (o.cancelled) return { text: "Odwołany", cls: "bg-red-600 text-white" };
  if (o.delayed) return { text: `+${o.delay}`, cls: "bg-orange-700 text-white" };
  if (o.onTime) return { text: "Planowo", cls: ON_TIME_BADGE_CLASS };
  return { text: "Brak danych", cls: "bg-gray-600 text-white" };
}

function TimeValue({ planned, expected, delayed, fallback }: Readonly<{
  planned: Date | null | undefined;
  expected: Date | null | undefined;
  delayed: boolean;
  fallback: string;
}>) {
  if (!planned) return <>{fallback}</>;
  if (delayed && expected) {
    return <span className="text-orange-600 dark:text-orange-400">{formatHm(expected)}</span>;
  }
  return <>{formatHm(planned)}</>;
}

export const TrainPlanItem = React.memo(({ train }: Readonly<{ train: TrackedTrain }>) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const relevant = isStatusRelevant(train, now);
  // Do faktycznego odjazdu (z opóźnieniem) czas, peron i opóźnienie dotyczą
  // stacji wyjazdu, potem stacji przyjazdu.
  const { delay, platform, status, loading, hide, stop } = useTrainPlanStatus(train, {
    enabled: relevant,
    refreshMs: relevant ? STATUS_REFRESH_MS : 0,
  });

  const isArrival = stop.phase === "arrival";
  // Po odjeździe nie wracamy do godziny odjazdu: gdy brak danych o przyjeździe, pokazujemy „—”.
  const planned = isArrival ? stop.planned : stop.planned ?? plannedDeparture(train);
  const statusLower = status.toLowerCase();
  const cancelled = statusLower.includes("odwołany");
  const inTransit = statusLower.includes("w trasie");
  const rateLimited = status === "Zbyt wiele zapytań";
  const arrived = hide;
  const delayed = !cancelled && delay > 0;
  const expected = isArrival ? stop.expected : stop.expected ?? expectedDeparture(train, delay);
  const platformValue = cleanValue(platform);
  const title = train.trainName ? train.trainName : train.trainNumber || "Pociąg";
  const timeLabel = isArrival ? `Przyjazd do: ${stop.station}` : `Odjazd z: ${stop.station}`;

  const onTime =
    (relevant || inTransit || arrived) && !loading && !rateLimited && Boolean(status) && status !== "Błąd połączenia";
  const badge = statusBadge({ cancelled, delayed, delay, onTime });
  return (
    <div className={"mb-2 p-2 rounded-lg group bg-surface border border-gray-200 dark:border-gray-800 shadow-sm text-text transition-colors"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-bold text-sm leading-tight truncate">
            {title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary min-w-0">
            <span className="truncate">{train.from || "?"}</span>
            <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{train.to || "?"}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          {loading && relevant && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" aria-label="Aktualizacja statusu" />}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.cls}`} aria-live="polite">
              {badge.text}
            </span>
          <Link href="/transport" title="Pokaż w transporcie" className={actionButton({ color: "blue" })}>
            <TrainFront className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col min-w-0" title={timeLabel}>
          <span className="sr-only">{timeLabel}</span>
          <span className="text-sm font-bold tabular-nums">
            <TimeValue
              planned={planned}
              expected={expected}
              delayed={delayed}
              fallback={(!isArrival && train.departureTime) || "–"}
            />
          </span>
        </div>
        
        <Detail label="Peron" value={platformValue} />
        <Detail label="Miejsce" value={train.wagon && train.seat ? `${train.wagon}\u00A0|\u00A0${train.seat}` : null} />
      </div>
    </div>
  );
});
TrainPlanItem.displayName = "TrainPlanItem";
