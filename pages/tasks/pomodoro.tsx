"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import UniversalTimer, { TimerPhase, TimerControls } from "../../components/Timer";
import { ListTodo, Settings, X } from "lucide-react";
import Seo from "../../components/SEO";

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
  const router = useRouter();

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

  const handleBack = useCallback(() => {
    const pathParts = router.pathname.split("/").filter(Boolean);
    if (pathParts.length > 1) {
      const parentPath = "/" + pathParts.slice(0, -1).join("/");
      router.push(parentPath);
    } else {
      router.push("/");
    }
  }, [router]);

  return (
    <>
      <Seo
        title="Pomodoro - Dzisiaj v3"
        description="Skup się na pracy wykorzystując technikę Pomodoro. Ustawiaj czas głębokiej pracy i optymalizuj przerwy."
        canonical="https://dzisiajv3.vercel.app/tasks/pomodoro"
        keywords="pomodoro, technika pomodoro, skupienie, focus, timer, praca głęboka"
      />
        <div className="flex justify-start gap-3 items-center mb-4 relative">
          <button
            onClick={handleBack}
            className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
            aria-label="Wróć"
          >
            <ListTodo className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-semibold">Pomodoro</h2>
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
          <button
            onClick={toggleOpen}
            className="transition"
            aria-label="Ustawienia"
          >
            {open ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <div className="mt-2 max-w-md mx-auto transition-all duration-300 overflow-hidden">
            <label className="flex justify-between px-4 py-2 items-center">
              <span>Focus (min):</span>
              <input
                type="number"
                value={focusSeconds / 60}
                onChange={(e) => setFocusSeconds(Number(e.target.value) * 60)}
                className="border rounded px-2 py-1 w-20 text-right"
                min={1}
              />
            </label>
            <label className="flex justify-between px-4 py-2 items-center">
              <span>Break (min):</span>
              <input
                type="number"
                value={breakSeconds / 60}
                onChange={(e) => setBreakSeconds(Number(e.target.value) * 60)}
                className="border rounded px-2 py-1 w-20 text-right"
                min={1}
              />
            </label>
          </div>
        )}
    </>
  );
}
