// __tests__/hooks/timerEngine.test.ts
//
// Licznik faz (pomodoro, trening interwałowy): przejścia faz i rund w reducerze.

import { describe, expect, it } from "vitest";
import { engineReducer } from "@/hooks/useTimer";

const phases = [
  { label: "Praca", seconds: 2 },
  { label: "Przerwa", seconds: 1 },
] as never[];
const base = { phaseIndex: 0, round: 1, secondsLeft: 2, running: true, paused: false, chimes: 0 };
const tick = (s: typeof base, rounds = 1) => engineReducer(s, { type: "tick", phases, rounds });

describe("engineReducer", () => {
  it("odlicza, potem przechodzi do następnej fazy z dźwiękiem", () => {
    const s1 = tick(base);
    expect(s1).toMatchObject({ secondsLeft: 1, phaseIndex: 0, chimes: 0 });
    const s2 = tick(s1);
    expect(s2).toMatchObject({ phaseIndex: 1, secondsLeft: 1, chimes: 1 });
  });

  it("po ostatniej fazie zaczyna kolejną rundę, a po ostatniej rundzie się zatrzymuje", () => {
    const lastPhase = { ...base, phaseIndex: 1, secondsLeft: 1 };
    expect(tick(lastPhase, 2)).toMatchObject({ round: 2, phaseIndex: 0, secondsLeft: 2, running: true });
    expect(tick(lastPhase, 1)).toMatchObject({ running: false, chimes: 1 });
  });

  it("pauza wstrzymuje odliczanie", () => {
    expect(tick({ ...base, paused: true })).toEqual({ ...base, paused: true });
  });

  it("stop wraca do pierwszej fazy i pierwszej rundy", () => {
    expect(engineReducer({ ...base, phaseIndex: 1, round: 3 }, { type: "stop", phases })).toMatchObject({
      running: false,
      phaseIndex: 0,
      round: 1,
      secondsLeft: 2,
    });
  });
});
