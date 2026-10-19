// __tests__/lib/pomodoro.test.ts

import { describe, expect, it } from "vitest";
import { pomodoroReducer } from "@/lib/pomodoro";

const d = { focus: 3, break: 2 };
const running = { secondsLeft: 1, running: true, paused: false, isBreak: false, round: 1 };

describe("pomodoroReducer", () => {
  it("po skupieniu zatrzymuje się i przygotowuje przerwę", () => {
    expect(pomodoroReducer(running, { type: "tick", ...d })).toEqual({
      secondsLeft: 2,
      running: false,
      paused: false,
      isBreak: true,
      round: 1,
    });
  });

  it("po przerwie przygotowuje skupienie i liczy kolejną rundę", () => {
    expect(pomodoroReducer({ ...running, isBreak: true }, { type: "tick", ...d })).toMatchObject({
      isBreak: false,
      secondsLeft: 3,
      round: 2,
    });
  });

  it("start bez pozostałego czasu bierze długość bieżącej fazy", () => {
    const stopped = { ...running, running: false, secondsLeft: 0 };
    expect(pomodoroReducer(stopped, { type: "start", current: 0, ...d })).toMatchObject({
      running: true,
      secondsLeft: 3,
    });
  });
});
