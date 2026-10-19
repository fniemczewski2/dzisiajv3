// pages/tasks/pomodoro.tsx

import { pomodoroReducer } from "@/lib/pomodoro";
import { useEffect, useReducer, useState } from "react";
import UniversalTimer, { TimerPhase, TimerControls } from "@/components/ui/Timer";
import { Settings, X } from "lucide-react";
import Seo from "@/components/ui/SEO";

export default function PomodoroPage() {
  const DEFAULT_FOCUS = 25 * 60;
  const DEFAULT_BREAK = 5 * 60;

  const [focusSeconds, setFocusSeconds] = useState(DEFAULT_FOCUS);
  const [breakSeconds, setBreakSeconds] = useState(DEFAULT_BREAK);
  const [open, setOpen] = useState(false);

  const [state, dispatch] = useReducer(pomodoroReducer, {
    secondsLeft: DEFAULT_FOCUS,
    running: false,
    paused: false,
    isBreak: false,
    round: 1,
  });
  const { running, paused, isBreak, round } = state;
  // Zatrzymana faza skupienia pokazuje aktualnie ustawioną długość (zmiana w ustawieniach).
  const secondsLeft = !running && !isBreak ? focusSeconds : state.secondsLeft;
  const durations = { focus: focusSeconds, break: breakSeconds };

  const toggleOpen = () => setOpen((prev) => !prev);

  const phases: TimerPhase[] = [
    { label: "Focus", seconds: focusSeconds },
    { label: "Przerwa", seconds: breakSeconds },
  ];

  const phaseIndex = isBreak ? 1 : 0;

  // Tykanie co sekundę; koniec fazy (zmiana na przerwę/skupienie) liczy reducer.
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => dispatch({ type: "tick", focus: focusSeconds, break: breakSeconds }), 1000);
    return () => clearInterval(id);
  }, [running, paused, focusSeconds, breakSeconds]);

  const controls: TimerControls = {
    start: () => dispatch({ type: "start", current: secondsLeft, ...durations }),
    pause: () => dispatch({ type: "togglePause" }),
    stop: () => dispatch({ type: "stop", ...durations }),
    next: () => dispatch({ type: "switch", toBreak: !isBreak, countRound: isBreak, ...durations }),
    prev: () => dispatch({ type: "switch", toBreak: !isBreak, countRound: false, ...durations }),
    jumpToPhase: (index: number) => dispatch({ type: "switch", toBreak: index === 1, countRound: false, ...durations }),
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
