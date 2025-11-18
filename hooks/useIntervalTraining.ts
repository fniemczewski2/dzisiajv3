import { useState, useEffect } from "react";
import { useTimerEngine } from "./useTimer";
import type { TimerPhase } from "../components/Timer";

export type IntervalConfig = {
  workSeconds: number;
  restSeconds: number;
  sets: number; // sets per cycle
  cycles: number; // cycles (rounds)
  longRestSeconds?: number;
  longRestAfterCycles?: number;
};

export function useIntervalTraining(cfg: IntervalConfig) {
  const [phases, setPhases] = useState<TimerPhase[]>([]);

  const buildPhases = () => {
    const p: TimerPhase[] = [];
    for (let s = 0; s < cfg.sets; s++) {
      p.push({ label: `Ćwiczenia ${s + 1}`, seconds: cfg.workSeconds });
      p.push({ label: `Przerwa ${s + 1}`, seconds: cfg.restSeconds });
    }
    if (cfg.longRestSeconds && cfg.longRestAfterCycles) {
      p.push({ label: "Długa przerwa", seconds: cfg.longRestSeconds });
    }
    setPhases(p);
  };

  useEffect(() => {
    buildPhases();
  }, [cfg.workSeconds, cfg.restSeconds, cfg.sets, cfg.cycles, cfg.longRestSeconds, cfg.longRestAfterCycles]);

  const engine = useTimerEngine(phases, cfg.cycles);

  return {
    ...engine,
    phases,
  };
}