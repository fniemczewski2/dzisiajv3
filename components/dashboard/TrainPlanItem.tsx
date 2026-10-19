// components/dashboard/TrainPlanItem.tsx

import { useNow } from "@/hooks/useNow";
import { TRAIN_STATUS_REFRESH_MS, TRAIN_PLAN_TICK_MS } from "@/config/timing";
import React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, TrainFront } from "lucide-react";
import { useTrainPlanStatus } from "@/hooks/db/useTrains";
import type { TrackedTrain } from "@/types/transport";
import { actionButton } from "../ui/CommonButtons";
import { cleanValue, expectedDeparture, formatHm, isStatusRelevant, plannedDeparture } from "@/lib/trainPlan";

function Detail({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="flex min-w-0 items-end justify-center">
      <span className="text-xs text-text-muted">{label}:&nbsp;</span>
      <span className={`truncate text-sm font-bold tabular-nums ${value ? "text-text" : "text-text-muted"}`}>
        {value ?? "–"}
      </span>
    </div>
  );
}

type Badge = { text: string; cls: string };

const ON_TIME_BADGE_CLASS = "bg-success-solid text-white";

function statusBadge(o: { cancelled: boolean; delayed: boolean; delay: number; onTime: boolean }): Badge {
  if (o.cancelled) return { text: "Odwołany", cls: "bg-danger-solid text-white" };
  if (o.delayed) return { text: `+${o.delay}`, cls: "bg-warning-solid text-white" };
  if (o.onTime) return { text: "Planowo", cls: ON_TIME_BADGE_CLASS };
  return { text: "Brak danych", cls: "bg-input text-white" };
}

function TimeValue({
  planned,
  expected,
  delayed,
  fallback,
}: Readonly<{
  planned: Date | null | undefined;
  expected: Date | null | undefined;
  delayed: boolean;
  fallback: string;
}>) {
  if (!planned) return <>{fallback}</>;
  if (delayed && expected) {
    return <span className="text-warning">{formatHm(expected)}</span>;
  }
  return <>{formatHm(planned)}</>;
}

export const TrainPlanItem = React.memo(({ train }: Readonly<{ train: TrackedTrain }>) => {
  const now = useNow(TRAIN_PLAN_TICK_MS);

  const relevant = isStatusRelevant(train, now);
  const { delay, platform, status, loading, hide, stop } = useTrainPlanStatus(train, {
    enabled: relevant,
    refreshMs: relevant ? TRAIN_STATUS_REFRESH_MS : 0,
  });

  const isArrival = stop.phase === "arrival";
  const planned = isArrival ? stop.planned : (stop.planned ?? plannedDeparture(train));
  const statusLower = status.toLowerCase();
  const cancelled = statusLower.includes("odwołany");
  const inTransit = statusLower.includes("w trasie");
  const rateLimited = status === "Zbyt wiele zapytań";
  const arrived = hide;
  const delayed = !cancelled && delay > 0;
  const expected = isArrival ? stop.expected : (stop.expected ?? expectedDeparture(train, delay));
  const platformValue = cleanValue(platform);
  const title = train.trainName ? train.trainName : train.trainNumber || "Pociąg";
  const timeLabel = isArrival ? `Przyjazd do: ${stop.station}` : `Odjazd z: ${stop.station}`;

  const onTime =
    (relevant || inTransit || arrived) && !loading && !rateLimited && Boolean(status) && status !== "Błąd połączenia";
  const badge = statusBadge({ cancelled, delayed, delay, onTime });
  return (
    <div className={"group mb-2 rounded-lg border border-line bg-surface p-2 text-text shadow-sm transition-colors"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm leading-tight font-bold">{title}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-text-secondary">
            <span className="truncate">{train.from || "?"}</span>
            <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{train.to || "?"}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
          {loading && relevant && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" aria-label="Aktualizacja statusu" />
          )}
          <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${badge.cls}`} aria-live="polite">
            {badge.text}
          </span>
          <Link href="/trains" title="Pokaż w pociągach" className={actionButton({ color: "info" })}>
            <TrainFront className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex min-w-0 flex-col" title={timeLabel}>
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
