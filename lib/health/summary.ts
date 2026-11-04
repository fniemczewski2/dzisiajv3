// lib/health/summary.ts
//
// Podsumowania liczone w aplikacji z surowych danych: tętno (ostatni pomiar, średnia, minimum, maksimum) i sen
// (czas snu, przebudzeń i w łóżku oraz czas w fazach). Czyste funkcje – bez dostępu do bazy.

import { ASLEEP_STAGES, SLEEP_STAGES, type SleepStage } from "@/lib/health/sleepStages";

export interface HeartRateRecord {
  recorded_at: string;
  bpm: number;
}

export interface HeartRateSummary {
  count: number;
  /** Ostatni pomiar (najpóźniejszy znacznik czasu, niezależnie od kolejności na liście). */
  latest: HeartRateRecord;
  /** Średnia arytmetyczna pomiarów (nie ważona czasem), z dokładnością do 0,1. */
  avg: number;
  min: number;
  max: number;
}

export function summarizeHeartRate(records: readonly HeartRateRecord[]): HeartRateSummary | null {
  if (records.length === 0) return null;
  let latest = records[0];
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const record of records) {
    sum += record.bpm;
    min = Math.min(min, record.bpm);
    max = Math.max(max, record.bpm);
    if (Date.parse(record.recorded_at) > Date.parse(latest.recorded_at)) latest = record;
  }
  return { count: records.length, latest, avg: Math.round((sum / records.length) * 10) / 10, min, max };
}

export interface SleepSegment {
  stage: SleepStage;
  started_at: string;
  ended_at: string;
}

/**
 * Gdy odcinki nakładają się (np. iPhone i zegarek zapisały ten sam czas), o fazie decyduje priorytet:
 * głęboki > REM > podstawowy > przebudzenie > sen bez podziału > w łóżku (jawne przebudzenie z zegarka wygrywa z ogólnym
 * „snem” z telefonu). Dzięki temu czas nie jest liczony dwa razy.
 */
const PRIORITY: Record<SleepStage, number> = { deep: 6, rem: 5, core: 4, awake: 3, asleep: 2, in_bed: 1 };

interface Interval {
  stage: SleepStage;
  from: number;
  to: number;
}

function stageAt(items: readonly Interval[], from: number, to: number): SleepStage | null {
  let best: SleepStage | null = null;
  for (const item of items) {
    if (item.from <= from && item.to >= to && (best === null || PRIORITY[item.stage] > PRIORITY[best]))
      best = item.stage;
  }
  return best;
}

/** Oś czasu bez nakładania: kolejne odcinki w jednej fazie są łączone. */
export function resolveSleepTimeline(segments: readonly SleepSegment[]): SleepSegment[] {
  const items: Interval[] = segments
    .map((s) => ({ stage: s.stage, from: Date.parse(s.started_at), to: Date.parse(s.ended_at) }))
    .filter((s) => Number.isFinite(s.from) && Number.isFinite(s.to) && s.to > s.from);
  const points = [...new Set(items.flatMap((s) => [s.from, s.to]))].sort((a, b) => a - b);
  const out: Interval[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const stage = stageAt(items, points[i], points[i + 1]);
    if (!stage) continue;
    const last = out.at(-1);
    if (last?.stage === stage && last.to === points[i]) last.to = points[i + 1];
    else out.push({ stage, from: points[i], to: points[i + 1] });
  }
  return out.map((s) => ({
    stage: s.stage,
    started_at: new Date(s.from).toISOString(),
    ended_at: new Date(s.to).toISOString(),
  }));
}

export interface SleepSummary {
  timeline: SleepSegment[];
  /** Minuty w każdej fazie (po usunięciu nakładania). */
  stageMinutes: Record<SleepStage, number>;
  /** Sen: głęboki + REM + podstawowy + bez podziału. */
  asleepMinutes: number;
  awakeMinutes: number;
  /** Cały zarejestrowany czas (sen, przebudzenia i czas w łóżku bez snu). */
  inBedMinutes: number;
  startedAt: string;
  endedAt: string;
}

const minutes = (ms: number) => Math.round(ms / 60_000);

export function summarizeSleep(segments: readonly SleepSegment[]): SleepSummary | null {
  const timeline = resolveSleepTimeline(segments);
  if (timeline.length === 0) return null;
  const ms = Object.fromEntries(SLEEP_STAGES.map((stage) => [stage, 0])) as Record<SleepStage, number>;
  for (const s of timeline) ms[s.stage] += Date.parse(s.ended_at) - Date.parse(s.started_at);
  const stageMinutes = Object.fromEntries(SLEEP_STAGES.map((stage) => [stage, minutes(ms[stage])])) as Record<
    SleepStage,
    number
  >;
  return {
    timeline,
    stageMinutes,
    asleepMinutes: minutes(ASLEEP_STAGES.reduce((sum, stage) => sum + ms[stage], 0)),
    awakeMinutes: stageMinutes.awake,
    inBedMinutes: minutes(SLEEP_STAGES.reduce((sum, stage) => sum + ms[stage], 0)),
    startedAt: timeline[0].started_at,
    endedAt: (timeline.at(-1) ?? timeline[0]).ended_at,
  };
}
