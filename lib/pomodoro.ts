// lib/pomodoro.ts
//
// Stan licznika Pomodoro: skupienie i przerwa na zmianę, każda faza
// uruchamiana ręcznie. Reducer zamiast kilku efektów reagujących na stan.

export interface PomodoroState {
  secondsLeft: number;
  running: boolean;
  paused: boolean;
  isBreak: boolean;
  round: number;
}

type Durations = { focus: number; break: number };

type PomodoroAction =
  | ({ type: "tick" } & Durations)
  | ({ type: "start"; current: number } & Durations)
  | { type: "togglePause" }
  | ({ type: "stop" } & Durations)
  | ({ type: "switch"; toBreak: boolean; countRound: boolean } & Durations);

/** Jedna sekunda; na końcu fazy zatrzymanie i przygotowanie kolejnej (start ręczny). */
function tick(state: PomodoroState, durations: Durations): PomodoroState {
  if (!state.running || state.paused) return state;
  if (state.secondsLeft > 1) return { ...state, secondsLeft: state.secondsLeft - 1 };
  const toBreak = !state.isBreak;
  return {
    ...state,
    running: false,
    paused: false,
    isBreak: toBreak,
    secondsLeft: toBreak ? durations.break : durations.focus,
    round: toBreak ? state.round : state.round + 1,
  };
}

export function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case "tick":
      return tick(state, action);
    case "start": {
      const fallback = state.isBreak ? action.break : action.focus;
      return { ...state, secondsLeft: action.current > 0 ? action.current : fallback, running: true, paused: false };
    }
    case "togglePause":
      return { ...state, paused: !state.paused };
    case "stop":
      return { running: false, paused: false, isBreak: false, secondsLeft: action.focus, round: 1 };
    case "switch":
      return {
        ...state,
        isBreak: action.toBreak,
        secondsLeft: action.toBreak ? action.break : action.focus,
        round: action.countRound ? state.round + 1 : state.round,
      };
  }
}
