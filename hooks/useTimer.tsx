import { useEffect, useRef, useState } from "react";
import type { TimerPhase } from "../components/Timer";

export function useTimerEngine(phases: TimerPhase[], rounds = 1, autoStart = false) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(phases[0]?.seconds ?? 0);
  const [running, setRunning] = useState(autoStart);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // sync seconds when phase changes and not running
  useEffect(() => {
    if (!running) {
      setSecondsLeft(phases[phaseIndex]?.seconds ?? 0);
    }
  }, [phaseIndex, phases, running]);

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, paused]);

  useEffect(() => {
    if (secondsLeft <= 0 && running) {
      const nextPhase = phaseIndex + 1;
      if (nextPhase < phases.length) {
        setPhaseIndex(nextPhase);
        setSecondsLeft(phases[nextPhase].seconds);
      } else {
        if (round < rounds) {
          setRound((r) => r + 1);
          setPhaseIndex(0);
          setSecondsLeft(phases[0].seconds);
        } else {
          setRunning(false);
          setPaused(false);
        }
      }
    }
  }, [secondsLeft, running, phaseIndex, phases, round, rounds]);

  const start = () => {
    if (!phases.length) return;
    setSecondsLeft((s) => (s > 0 ? s : phases[phaseIndex].seconds));
    setRunning(true);
    setPaused(false);
  };

  const pause = () => setPaused((p) => !p);
  const stop = () => {
    setRunning(false);
    setPaused(false);
    setPhaseIndex(0);
    setRound(1);
    setSecondsLeft(phases[0]?.seconds ?? 0);
  };

  const next = () => {
    const nextPhase = Math.min(phaseIndex + 1, phases.length - 1);
    setPhaseIndex(nextPhase);
    setSecondsLeft(phases[nextPhase].seconds);
  };

  const prev = () => {
    const prevPhase = Math.max(phaseIndex - 1, 0);
    setPhaseIndex(prevPhase);
    setSecondsLeft(phases[prevPhase].seconds);
  };

  const jumpToPhase = (index: number) => {
    if (index < 0 || index >= phases.length) return;
    setPhaseIndex(index);
    setSecondsLeft(phases[index].seconds);
  };

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
