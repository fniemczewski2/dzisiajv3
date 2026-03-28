// hooks/useIntervalTraining.ts

import { useMemo } from "react";
import { useTimerEngine } from "./useTimer";
import type { TimerPhase } from "../components/Timer";

export type IntervalConfig = {
  workSeconds: number;
  restSeconds: number;
  sets: number;
  cycles: number;
  longRestSeconds?: number;
  longRestAfterCycles?: number;
};

export function useIntervalTraining(cfg: IntervalConfig) {
  const phases = useMemo<TimerPhase[]>(() => {
    const p: TimerPhase[] = [];
    for (let s = 0; s < cfg.sets; s++) {
      p.push(
        { label: `Ćwiczenia ${s + 1}`, seconds: cfg.workSeconds },
        { label: `Przerwa ${s + 1}`,   seconds: cfg.restSeconds }
      );
    }
    if (cfg.longRestSeconds && cfg.longRestAfterCycles) {
      p.push({ label: "Długa przerwa", seconds: cfg.longRestSeconds });
    }
    return p;
  }, [cfg.workSeconds, cfg.restSeconds, cfg.sets, cfg.cycles, cfg.longRestSeconds, cfg.longRestAfterCycles]);

  const engine = useTimerEngine(phases, cfg.cycles);

  return { ...engine, phases };
}