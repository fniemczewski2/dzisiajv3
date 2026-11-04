// lib/health/heartRateThinning.ts
//
// Ograniczenie częstotliwości pomiarów tętna: najwyżej jeden pomiar w każdym przedziale 15 minut
// (przedziały liczone od północy UTC, czyli od początku epoki). Zostaje pierwszy pomiar w przedziale.

export const HEART_RATE_INTERVAL_MS = 15 * 60 * 1000;

/** Sortuje pomiary rosnąco wg czasu i zostawia najwyżej jeden w każdym przedziale `intervalMs`. */
export function thinHeartRateSamples<T extends { recorded_at: string }>(
  samples: readonly T[],
  intervalMs: number = HEART_RATE_INTERVAL_MS
): T[] {
  const sorted = samples
    .map((sample) => ({ sample, time: Date.parse(sample.recorded_at) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);

  const kept: T[] = [];
  let lastBucket = Number.NaN;
  for (const { sample, time } of sorted) {
    const bucket = Math.floor(time / intervalMs);
    if (bucket !== lastBucket) {
      kept.push(sample);
      lastBucket = bucket;
    }
  }
  return kept;
}
