// pages/tasks/pomodoro.tsx

import { useEffect, useState, useRef } from "react";
import UniversalTimer, { TimerPhase, TimerControls } from "@/components/ui/Timer";
import { Settings, X } from "lucide-react";
import Seo from "@/components/ui/SEO";

export default function PomodoroPage() {
  const DEFAULT_FOCUS = 25 * 60;
  const DEFAULT_BREAK = 5 * 60;

  const [focusSeconds, setFocusSeconds] = useState(DEFAULT_FOCUS);
  const [breakSeconds, setBreakSeconds] = useState(DEFAULT_BREAK);
  const [open, setOpen] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [round, setRound] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const toggleOpen = () => setOpen((prev) => !prev);

  const phases: TimerPhase[] = [
    { label: "Focus", seconds: focusSeconds },
    { label: "Przerwa", seconds: breakSeconds },
  ];

  const phaseIndex = isBreak ? 1 : 0;

  useEffect(() => {
    if (!running && !isBreak) {
      setSecondsLeft(focusSeconds);
    }
  }, [focusSeconds, running, isBreak]);

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, paused]);

  useEffect(() => {
    if (secondsLeft <= 0 && running) {
      setRunning(false);
      setPaused(false);
      const nextIsBreak = !isBreak;
      setIsBreak(nextIsBreak);
      setSecondsLeft(nextIsBreak ? breakSeconds : focusSeconds);
      if (!nextIsBreak) setRound((r) => r + 1);
    }
  }, [secondsLeft, running, isBreak, focusSeconds, breakSeconds]);

  const controls: TimerControls = {
    start: () => {
      const defaultSeconds = isBreak ? breakSeconds : focusSeconds;
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds > 0) {
          return currentSeconds;
        }
        return defaultSeconds;
      });

      setRunning(true);
      setPaused(false);
    },
    pause: () => setPaused((prev) => !prev),
    stop: () => {
      setRunning(false);
      setPaused(false);
      setIsBreak(false);
      setSecondsLeft(focusSeconds);
      setRound(1);
    },
    next: () => {
      const nextIsBreak = !isBreak;
      setIsBreak(nextIsBreak);
      setSecondsLeft(nextIsBreak ? breakSeconds : focusSeconds);
      if (!nextIsBreak) setRound((r) => r + 1);
    },
    prev: () => {
      const prevIsBreak = !isBreak;
      setIsBreak(prevIsBreak);
      setSecondsLeft(prevIsBreak ? breakSeconds : focusSeconds);
    },
    jumpToPhase: (index: number) => {
      setIsBreak(index === 1);
      setSecondsLeft(index === 1 ? breakSeconds : focusSeconds);
    },
  };

  const format = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
      <Seo
        title="Pomodoro"
        description="Licznik pracy techniką Pomodoro: bloki skupienia przeplatane przerwami, z własną długością każdej fazy."
        canonical="https://dzisiaj.fun/tasks/pomodoro"
        keywords="pomodoro, technika pomodoro, skupienie, focus, timer, praca głęboka"
      />
      <div className="relative mb-4 flex items-center justify-start gap-3">
        <h1 className="page-title">Pomodoro</h1>
      </div>

      <UniversalTimer
        secondsLeft={secondsLeft}
        running={running}
        paused={paused}
        phaseIndex={phaseIndex}
        round={round}
        phases={phases}
        controls={controls}
        formatTime={format}
      />

      <div className="mt-4 flex justify-center">
        <button onClick={toggleOpen} type="button" className="transition" aria-label="Ustawienia">
          {open ? <X className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-md overflow-hidden transition-all duration-300">
          <label className="flex items-center justify-between px-4 py-2">
            <span>Focus (min):</span>
            <input
              type="number"
              value={focusSeconds / 60}
              onChange={(e) => setFocusSeconds(Number(e.target.value) * 60)}
              className="input-field w-20 py-1.5 text-center tabular-nums"
              min={1}
            />
          </label>
          <label className="flex items-center justify-between px-4 py-2">
            <span>Break (min):</span>
            <input
              type="number"
              value={breakSeconds / 60}
              onChange={(e) => setBreakSeconds(Number(e.target.value) * 60)}
              className="input-field w-20 py-1.5 text-center tabular-nums"
              min={1}
            />
          </label>
        </div>
      )}
    </>
  );
}
