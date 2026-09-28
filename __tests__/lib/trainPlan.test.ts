// __tests__/lib/trainPlan.test.ts

import { describe, it, expect } from "vitest";
import { cleanValue, expectedDeparture, formatHm, isStatusRelevant, planHourKey, plannedDeparture, relativeDeparture } from "@/lib/trainPlan";

const t = { date: "2026-09-30", departureTime: "14:32" };

describe("trainPlan", () => {
  it("parses planned departure and the plan hour", () => {
    expect(formatHm(plannedDeparture(t)!)).toBe("14:32");
    expect(planHourKey(t)).toBe("14:00");
    expect(planHourKey({ date: t.date, departureTime: "5:07" })).toBe("05:00");
    expect(plannedDeparture({ date: "zła", departureTime: "14:32" })).toBeNull();
  });

  it("adds the delay to the expected departure", () => {
    expect(formatHm(expectedDeparture(t, 12)!)).toBe("14:44");
    expect(formatHm(expectedDeparture({ date: t.date, departureTime: "23:55" }, 10)!)).toBe("00:05");
    expect(formatHm(expectedDeparture(t, -5)!)).toBe("14:32");
  });

  it("queries live status only around the trip", () => {
    const dep = plannedDeparture(t)!;
    expect(isStatusRelevant(t, new Date(dep.getTime() - 4 * 3600_000))).toBe(false);
    expect(isStatusRelevant(t, new Date(dep.getTime() - 2 * 3600_000))).toBe(true);
    expect(isStatusRelevant(t, new Date(dep.getTime() + 5 * 3600_000))).toBe(true);
    expect(isStatusRelevant(t, new Date(dep.getTime() + 13 * 3600_000))).toBe(false);
  });

  it("formats relative time", () => {
    const dep = plannedDeparture(t)!;
    expect(relativeDeparture(dep, new Date(dep.getTime() - 25 * 60_000))).toBe("za 25 min");
    expect(relativeDeparture(dep, new Date(dep.getTime() - 125 * 60_000))).toBe("za 2 h 5 min");
    expect(relativeDeparture(dep, new Date(dep.getTime() + 60_000))).toBe("odjechał");
  });

  it("treats API placeholders as missing", () => {
    expect(cleanValue("-")).toBeNull();
    expect(cleanValue("...")).toBeNull();
    expect(cleanValue(" 3 ")).toBe("3");
  });
});
