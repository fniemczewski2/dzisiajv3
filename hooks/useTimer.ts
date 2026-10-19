// hooks/useTimer.ts

import { useEffect, useReducer, useRef } from "react";
import type { TimerPhase } from "@/components/ui/Timer";
import { useToast } from "@/providers/ToastProvider";

interface EngineState {
  phaseIndex: number;
  round: number;
  secondsLeft: number;
  running: boolean;
  paused: boolean;
  /** Licznik zakończonych faz – zmiana uruchamia dźwięk (efekt bez setState). */
  chimes: number;
}

type EngineAction =
  | { type: "tick"; phases: readonly TimerPhase[]; rounds: number }
  | { type: "start"; phases: readonly TimerPhase[] }
  | { type: "togglePause" }
  | { type: "stop"; phases: readonly TimerPhase[] }
  | { type: "goTo"; index: number; phases: readonly TimerPhase[] }
  | { type: "setPhaseIndex"; index: number }
  | { type: "setRound"; round: number };

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case "tick": {
      if (!state.running || state.paused) return state;
      if (state.secondsLeft > 1) return { ...state, secondsLeft: state.secondsLeft - 1 };
      // Koniec fazy: następna faza, następna runda albo koniec.
      const { phases, rounds } = action;
      const chimes = state.chimes + 1;
      const nextPhase = state.phaseIndex + 1;
      if (nextPhase < phases.length) {
        return { ...state, phaseIndex: nextPhase, secondsLeft: phases[nextPhase].seconds, chimes };
      }
      if (state.round < rounds) {
        return { ...state, round: state.round + 1, phaseIndex: 0, secondsLeft: phases[0].seconds, chimes };
      }
      return { ...state, running: false, paused: false, secondsLeft: 0, chimes };
    }
    case "start": {
      if (action.phases.length === 0) return state;
      const seconds =
        state.running && state.secondsLeft > 0 ? state.secondsLeft : action.phases[state.phaseIndex].seconds;
      return { ...state, secondsLeft: seconds, running: true, paused: false };
    }
    case "togglePause":
      return { ...state, paused: !state.paused };
    case "stop":
      return {
        ...state,
        running: false,
        paused: false,
        phaseIndex: 0,
        round: 1,
        secondsLeft: action.phases[0]?.seconds ?? 0,
      };
    case "goTo":
      return { ...state, phaseIndex: action.index, secondsLeft: action.phases[action.index]?.seconds ?? 0 };
    case "setPhaseIndex":
      return { ...state, phaseIndex: action.index };
    case "setRound":
      return { ...state, round: action.round };
  }
}

export function useTimerEngine(phases: TimerPhase[], rounds = 1, autoStart = false) {
  const [state, dispatch] = useReducer(engineReducer, undefined, () => ({
    phaseIndex: 0,
    round: 1,
    secondsLeft: phases[0]?.seconds ?? 0,
    running: autoStart,
    paused: false,
    chimes: 0,
  }));
  const { phaseIndex, round, running, paused, chimes } = state;
  // Zatrzymany licznik pokazuje pełny czas bieżącej fazy (także po zmianie ustawień faz).
  const secondsLeft = running ? state.secondsLeft : (phases[phaseIndex]?.seconds ?? 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    audioRef.current = new Audio("/KBING.mp3");
    audioRef.current.preload = "auto";
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    let stale = false;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && running && !paused) {
          const sentinel = await navigator.wakeLock.request("screen");
          if (stale) {
            await sentinel.release();
          } else {
            wakeLockRef.current = sentinel;
          }
        }
      } catch {
        toast.info("WakeLock niedostępny");
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (running && !paused) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && running && !paused) {
        void requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stale = true;
      void releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [running, paused, toast]);

  // Dźwięk przy każdym zakończeniu fazy (zmiana licznika `chimes`).
  useEffect(() => {
    if (chimes === 0 || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.warn("[useTimerEngine] Nie udało się odtworzyć dźwięku:", err);
    });
  }, [chimes]);

  // Tykanie co sekundę – przejścia między fazami liczy reducer.
  useEffect(() => {
    if (!running || paused) return;
    const id = globalThis.setInterval(() => dispatch({ type: "tick", phases, rounds }), 1000);
    return () => clearInterval(id);
  }, [running, paused, phases, rounds]);

  const start = () => dispatch({ type: "start", phases });
  const pause = () => dispatch({ type: "togglePause" });
  const stop = () => dispatch({ type: "stop", phases });
  const next = () => dispatch({ type: "goTo", index: Math.min(phaseIndex + 1, phases.length - 1), phases });
  const prev = () => dispatch({ type: "goTo", index: Math.max(phaseIndex - 1, 0), phases });
  const jumpToPhase = (index: number) => {
    if (index < 0 || index >= phases.length) return;
    dispatch({ type: "goTo", index, phases });
  };
  const setPhaseIndex = (index: number) => dispatch({ type: "setPhaseIndex", index });
  const setRound = (value: number) => dispatch({ type: "setRound", round: value });

  return {
    secondsLeft,
    running,
    paused,
    phaseIndex,
    round,
    start,
    pause,
    stop,
    next,
    prev,
    jumpToPhase,
    setPhaseIndex,
    setRound,
  };
}
