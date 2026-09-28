// components/dashboard/TrainPlanItem.tsx

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, TrainFront } from "lucide-react";
import { useTrainStatus } from "@/hooks/db/useTrains";
import type { TrackedTrain } from "@/types/transport";
import { actionButton } from "../ui/CommonButtons";
import {
  cleanValue,
  expectedDeparture,
  formatHm,
  isStatusRelevant,
  plannedDeparture,
  relativeDeparture,
} from "@/lib/trainPlan";

const STATUS_REFRESH_MS = 120_000;

function Detail({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-textMuted">{label}</span>
      <span className={`text-sm font-bold tabular-nums truncate ${value ? "text-text" : "text-textMuted"}`}>{value ?? "—"}</span>
    </div>
  );
}

/** Bilet w planie dnia: godzina odjazdu, peron, wagon, miejsce i opóźnienie na żywo. */
export const TrainPlanItem = React.memo(({ train }: Readonly<{ train: TrackedTrain }>) => {
  // Zegar do "za X min" i do włączania/wyłączania odświeżania statusu.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const relevant = isStatusRelevant(train, now);
  const { delay, platform, status, loading, hide } = useTrainStatus(train, {
    enabled: relevant,
    refreshMs: relevant ? STATUS_REFRESH_MS : 0,
  });

  const planned = plannedDeparture(train);
  const statusLower = status.toLowerCase();
  const cancelled = statusLower.includes("odwołany");
  const inTransit = statusLower.includes("w trasie");
  const rateLimited = status === "Zbyt wiele zapytań";
  const arrived = hide;
  const delayed = !cancelled && delay > 0;
  const expected = expectedDeparture(train, delayed && !inTransit ? delay : 0);
  const platformValue = cleanValue(platform);
  const title = [train.trainName, train.trainNumber].filter(Boolean).join(" ") || "Pociąg";

  let badge: { text: string; cls: string } | null = null;
  if (cancelled) badge = { text: "Odwołany", cls: "bg-red-600 text-white" };
  else if (arrived) badge = { text: "Dojechał", cls: "bg-surfaceHover text-textSecondary" };
  else if (inTransit) badge = { text: delay > 0 ? `W trasie · +${delay} min` : "W trasie", cls: delay > 0 ? "bg-orange-500 text-white" : "bg-indigo-600 text-white" };
  else if (delayed) badge = { text: `+${delay} min`, cls: "bg-orange-500 text-white" };
  else if (relevant && !loading && !rateLimited && status && status !== "Błąd połączenia") badge = { text: "Planowo", cls: "bg-emerald-500 text-white" };

  return (
    <div
      className={`mb-2 p-2.5 rounded-lg border shadow-sm text-text transition-colors ${
        cancelled
          ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-900"
          : arrived
          ? "bg-surface border-gray-200 dark:border-gray-800 opacity-60"
          : "bg-surface border-l-4 border-l-primary border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-bold text-sm leading-tight">
            <TrainFront className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{title}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-textSecondary min-w-0">
            <span className="truncate">{train.from || "?"}</span>
            <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{train.to || "?"}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          {loading && relevant && <Loader2 className="w-3.5 h-3.5 animate-spin text-textMuted" aria-label="Aktualizacja statusu" />}
          {badge && (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${badge.cls}`} aria-live="polite">
              {badge.text}
            </span>
          )}
          <Link href="/transport" title="Pokaż w transporcie" className={actionButton({ color: "blue" })}>
            <TrainFront className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-textMuted">Odjazd</span>
          <span className="text-sm font-bold tabular-nums">
            {planned ? (
              delayed && !inTransit && expected ? (
                <>
                  <span className="line-through text-textMuted font-medium mr-1">{formatHm(planned)}</span>
                  <span className="text-orange-600 dark:text-orange-400">{formatHm(expected)}</span>
                </>
              ) : (
                formatHm(planned)
              )
            ) : (
              train.departureTime || "—"
            )}
          </span>
        </div>
        <Detail label="Peron" value={platformValue} />
        <Detail label="Wagon" value={cleanValue(train.wagon)} />
        <Detail label="Miejsce" value={cleanValue(train.seat)} />
      </div>

      {(expected && !cancelled && !arrived && !inTransit && relevant) || rateLimited ? (
        <p className="mt-1.5 text-[11px] text-textMuted flex items-center gap-1">
          {rateLimited ? (
            <><AlertTriangle className="w-3 h-3" /> Limit zapytań PKP – opóźnienie zaktualizuje się za chwilę.</>
          ) : (
            expected && relativeDeparture(expected, now)
          )}
        </p>
      ) : null}
    </div>
  );
});
TrainPlanItem.displayName = "TrainPlanItem";
