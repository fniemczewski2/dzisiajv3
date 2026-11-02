// components/health/SleepSection.tsx
//
// Sen z wybranej doby: czas snu, przebudzeń i w łóżku, udział faz (pasek i tabela) oraz przebieg nocy.

import React, { useMemo } from "react";
import { Moon } from "lucide-react";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { SLEEP_STAGES, SLEEP_STAGE_LABELS, type SleepStage } from "@/lib/health/sleepStages";
import { summarizeSleep, type SleepSegment, type SleepSummary } from "@/lib/health/summary";
import { warsawTime } from "@/lib/health/time";
import { formatMinutes } from "@/lib/health/format";
import StatTile from "./StatTile";

interface Props {
  segments: SleepSegment[];
  loading: boolean;
  /** Czas snu przesłany bez faz (starsze wysyłki) – pokazywany, gdy brak odcinków. */
  fallbackMinutes?: number | null;
}

const STAGE_COLORS: Record<SleepStage, string> = {
  deep: "bg-deco-violet-solid",
  rem: "bg-deco-cyan-solid",
  core: "bg-info-solid",
  asleep: "bg-success-solid",
  awake: "bg-warning-solid",
  in_bed: "bg-input",
};

const durationMinutes = (s: SleepSegment) => Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60_000);

function StageBreakdown({ summary }: Readonly<{ summary: SleepSummary }>) {
  const stages = SLEEP_STAGES.filter((stage) => summary.stageMinutes[stage] > 0);
  const share = (stage: SleepStage) => Math.round((summary.stageMinutes[stage] / summary.inBedMinutes) * 100);
  const description = stages.map((s) => `${SLEEP_STAGE_LABELS[s]} ${share(s)}%`).join(", ");
  return (
    <div className="space-y-3">
      <p className="sr-only">Udział faz snu: {description}.</p>
      <div aria-hidden="true" className="flex h-4 w-full overflow-hidden rounded-full bg-surface">
        {stages.map((stage) => (
          <div
            key={stage}
            className={STAGE_COLORS[stage]}
            style={{ width: `${(summary.stageMinutes[stage] / summary.inBedMinutes) * 100}%` }}
          />
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Czas w poszczególnych fazach snu</caption>
          <thead>
            <tr className="text-left text-text-muted">
              <th scope="col" className="py-1 pr-3 font-semibold">
                Faza
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-semibold">
                Czas
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Udział
              </th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage} className="border-t border-line text-text tabular-nums">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                  <span className={`mr-2 inline-block h-3 w-3 rounded-sm ${STAGE_COLORS[stage]}`} aria-hidden="true" />
                  {SLEEP_STAGE_LABELS[stage]}
                </th>
                <td className="py-1.5 pr-3 text-right">{formatMinutes(summary.stageMinutes[stage])}</td>
                <td className="py-1.5 text-right">{share(stage)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Timeline({ timeline }: Readonly<{ timeline: SleepSegment[] }>) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Przebieg nocy: kolejne fazy snu</caption>
          <thead className="sticky top-0 bg-card">
            <tr className="text-left text-text-muted">
              <th scope="col" className="px-3 py-2 font-semibold">
                Od – do
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Faza
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Czas
              </th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((s) => (
              <tr key={`${s.started_at}-${s.stage}`} className="border-t border-line text-text tabular-nums">
                <td className="px-3 py-1.5">
                  {warsawTime(s.started_at)}–{warsawTime(s.ended_at)}
                </td>
                <td className="px-3 py-1.5">{SLEEP_STAGE_LABELS[s.stage]}</td>
                <td className="px-3 py-1.5 text-right">{formatMinutes(durationMinutes(s))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SleepSection({ segments, loading, fallbackMinutes = null }: Readonly<Props>) {
  const summary = useMemo(() => summarizeSleep(segments), [segments]);

  let body: React.ReactNode;
  if (loading) {
    body = <SkeletonList count={3} variant="row" />;
  } else if (summary) {
    body = (
      <>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Sen" value={formatMinutes(summary.asleepMinutes)} />
          <StatTile label="Przebudzenia" value={formatMinutes(summary.awakeMinutes)} />
          <StatTile label="Czas w łóżku" value={formatMinutes(summary.inBedMinutes)} />
          <StatTile label="Okno snu" value={`${warsawTime(summary.startedAt)}–${warsawTime(summary.endedAt)}`} />
        </dl>
        <StageBreakdown summary={summary} />
        <Timeline timeline={summary.timeline} />
      </>
    );
  } else if (fallbackMinutes !== null) {
    body = (
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Sen" value={formatMinutes(fallbackMinutes)} hint="Bez podziału na fazy" />
      </dl>
    );
  } else {
    body = <NoResultsState text="danych o śnie" hint="Skrót iOS nie przesłał jeszcze snu z tej doby." />;
  }

  return (
    <section aria-labelledby="sleep-heading" className="space-y-3">
      <h2 id="sleep-heading" className="section-title flex items-center gap-2">
        <Moon className="h-5 w-5" aria-hidden="true" /> Sen
      </h2>
      {body}
    </section>
  );
}
