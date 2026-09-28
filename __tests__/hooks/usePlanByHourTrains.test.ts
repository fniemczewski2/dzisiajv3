// __tests__/hooks/usePlanByHourTrains.test.ts

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePlanByHour } from "@/hooks/usePlanByHour";
import type { TrackedTrain } from "@/types/transport";

const train = (id: string, departureTime: string): TrackedTrain => ({
  id, userId: "u", createdAt: "", trainNumber: "5320", trainName: "IC Kasztelan", date: "2026-09-30",
  departureTime, from: "Poznań Główny", to: "Warszawa Centralna", wagon: "12", seat: "45",
});

const base = { schemas: [], events: [], workLogs: [], scheduledTasks: [], currentDayOfWeek: 3, isToday: false, overrides: [] };

describe("usePlanByHour with trains", () => {
  it("places tickets in the departure hour, sorted by minute, before other items", () => {
    const { result } = renderHook(() => usePlanByHour({ ...base, trains: [train("b", "14:50"), train("a", "14:05")] }));
    expect(result.current["14:00"].map((i) => [i.type, i.id])).toEqual([["train", "a"], ["train", "b"]]);
    expect(result.current["14:00"][0].train?.seat).toBe("45");
  });

  it("creates an hour slot for trains before the plan starts (06:00)", () => {
    const { result } = renderHook(() => usePlanByHour({ ...base, trains: [train("early", "05:12")] }));
    expect(result.current["05:00"]?.[0]?.id).toBe("early");
  });
});
