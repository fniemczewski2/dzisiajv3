// __tests__/lib/health/sleepStages.test.ts

import { describe, it, expect } from "vitest";
import { normalizeSleepStage } from "@/lib/health/sleepStages";

describe("normalizeSleepStage", () => {
  it.each([
    ["Głęboki", "deep"],
    ["głęboki sen", "deep"],
    ["Deep", "deep"],
    ["REM", "rem"],
    ["Podstawowy", "core"],
    ["Rdzeń", "core"],
    ["Core", "core"],
    ["Przebudzenie", "awake"],
    ["Czuwanie", "awake"],
    ["Awake", "awake"],
    ["W łóżku", "in_bed"],
    ["In Bed", "in_bed"],
    ["Nieokreślony", "asleep"],
    ["Asleep", "asleep"],
    ["HKCategoryValueSleepAnalysisAsleepDeep", "deep"],
    ["HKCategoryValueSleepAnalysisAsleepREM", "rem"],
    ["HKCategoryValueSleepAnalysisAwake", "awake"],
    ["HKCategoryValueSleepAnalysisInBed", "in_bed"],
    ["  PODSTAWOWY ", "core"],
  ])("%j → %s", (raw, expected) => {
    expect(normalizeSleepStage(raw)).toBe(expected);
  });

  it("wartości liczbowe HealthKit (liczby i tekst)", () => {
    expect(normalizeSleepStage(4)).toBe("deep");
    expect(normalizeSleepStage("3")).toBe("core");
    expect(normalizeSleepStage(0)).toBe("in_bed");
    expect(normalizeSleepStage(9)).toBeNull();
  });

  it.each([["xyz"], [""], [undefined], [null], [{}], [[]]])("nieznana wartość %j → null", (raw) => {
    expect(normalizeSleepStage(raw)).toBeNull();
  });
});
