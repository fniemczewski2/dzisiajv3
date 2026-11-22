// __tests__/hooks/usePlanSensors.test.ts

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MouseSensor, TouchSensor } from "@dnd-kit/core";
import { usePlanSensors } from "@/hooks/useDashboardDnd";

describe("usePlanSensors", () => {
  it("dotyk wymaga przytrzymania, mysz progu odległości", () => {
    const { result } = renderHook(() => usePlanSensors());
    const sensors = result.current;

    const mouse = sensors.find((s) => s.sensor === MouseSensor);
    const touch = sensors.find((s) => s.sensor === TouchSensor);

    expect(mouse?.options).toEqual({ activationConstraint: { distance: 8 } });
    expect(touch?.options).toEqual({ activationConstraint: { delay: 350, tolerance: 8 } });
  });

  it("bez PointerSensor – nie przechwytuje gestu przewijania", () => {
    const { result } = renderHook(() => usePlanSensors());
    expect(result.current.map((s) => s.sensor.name)).toEqual(["MouseSensor", "TouchSensor"]);
  });
});
