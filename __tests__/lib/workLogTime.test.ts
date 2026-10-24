// __tests__/lib/workLogTime.test.ts

import { describe, it, expect } from "vitest";
import { toIsoWithLocalOffset, toLocalInputValue, validateWorkLogRange } from "@/lib/workLogTime";

describe("konwersja czasu wpisu", () => {
  it("wartość z pola po zapisie i odczycie wraca bez zmian (niezależnie od strefy)", () => {
    const iso = toIsoWithLocalOffset("2026-10-24T10:30");
    expect(toLocalInputValue(iso)).toBe("2026-10-24T10:30");
  });

  it("zapisany czas zawiera przesunięcie strefy", () => {
    expect(toIsoWithLocalOffset("2026-10-24T10:30")).toMatch(/^2026-10-24T10:30:00[+-]\d{2}:\d{2}$/);
  });
});

describe("validateWorkLogRange", () => {
  const start = toIsoWithLocalOffset("2026-10-24T10:00");

  it("koniec późniejszy niż początek jest poprawny", () => {
    expect(validateWorkLogRange(start, toIsoWithLocalOffset("2026-10-24T11:00"))).toBeNull();
  });

  it("koniec równy początkowi lub wcześniejszy jest błędem", () => {
    expect(validateWorkLogRange(start, toIsoWithLocalOffset("2026-10-24T10:00"))).toMatch(/późniejszy/);
    expect(validateWorkLogRange(start, toIsoWithLocalOffset("2026-10-24T09:00"))).toMatch(/późniejszy/);
  });

  it("brak końca (wpis trwa) nie jest błędem", () => {
    expect(validateWorkLogRange(start, null)).toBeNull();
    expect(validateWorkLogRange(start, undefined)).toBeNull();
  });
});
