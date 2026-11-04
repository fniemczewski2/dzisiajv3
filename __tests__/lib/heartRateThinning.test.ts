// __tests__/lib/heartRateThinning.test.ts

import { describe, it, expect } from "vitest";
import { HEART_RATE_INTERVAL_MS, thinHeartRateSamples } from "@/lib/health/heartRateThinning";

const at = (iso: string, bpm = 60) => ({ recorded_at: iso, bpm });

describe("thinHeartRateSamples", () => {
  it("minutowe pomiary → jeden na przedział 15 minut (pierwszy w przedziale)", () => {
    const samples = Array.from({ length: 60 }, (_, m) => at(`2026-11-04T10:${String(m).padStart(2, "0")}:00Z`, 60 + m));
    const kept = thinHeartRateSamples(samples);
    expect(kept.map((s) => s.recorded_at)).toEqual([
      "2026-11-04T10:00:00Z",
      "2026-11-04T10:15:00Z",
      "2026-11-04T10:30:00Z",
      "2026-11-04T10:45:00Z",
    ]);
    expect(kept[1].bpm).toBe(75);
  });

  it("żadne dwa zachowane pomiary nie są bliżej niż przedział w tym samym oknie", () => {
    const samples = Array.from({ length: 500 }, (_, i) =>
      at(new Date(Date.UTC(2026, 10, 4) + i * 37_000).toISOString())
    );
    const kept = thinHeartRateSamples(samples);
    const buckets = kept.map((s) => Math.floor(Date.parse(s.recorded_at) / HEART_RATE_INTERVAL_MS));
    expect(new Set(buckets).size).toBe(buckets.length);
    expect(kept.length).toBeLessThan(samples.length);
  });

  it("sortuje wejście i nie zależy od kolejności", () => {
    const kept = thinHeartRateSamples([at("2026-11-04T10:08:00Z", 80), at("2026-11-04T10:05:00Z", 70)]);
    expect(kept).toEqual([at("2026-11-04T10:05:00Z", 70)]);
  });

  it("pomiary z niepoprawnym czasem są pomijane; pusta lista zwraca pustą", () => {
    expect(thinHeartRateSamples([at("nie-data")])).toEqual([]);
    expect(thinHeartRateSamples([])).toEqual([]);
  });

  it("granica przedziału: 10:14:59 i 10:15:00 to dwa różne przedziały", () => {
    const kept = thinHeartRateSamples([at("2026-11-04T10:14:59Z"), at("2026-11-04T10:15:00Z")]);
    expect(kept).toHaveLength(2);
  });
});
