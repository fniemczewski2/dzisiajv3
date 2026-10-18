// components/ui/Timer.tsx

import React from "react";
import { Play, Pause, X, ChevronLeft, ChevronRight, Coffee, Target, Dumbbell, Save } from "lucide-react";

interface TimerControlButtonsProps {
  controls: TimerControls;
  running: boolean;
  paused: boolean;
  isMultiPhase: boolean;
}

export type TimerPhase = {
  id?: string;
  label: string;
  seconds: number;
};

export type TimerControls = {
  start: () => void;
  pause: () => void;
  stop?: () => void;
  cancel?: () => void;
  next?: () => void;
  prev?: () => void;
  jumpToPhase?: (index: number) => void;
};

export type UniversalTimerProps = {
  secondsLeft: number;
  running: boolean;
  paused: boolean;
  phases?: TimerPhase[];
  phaseIndex?: number;
  round?: number;
  title?: string;
  controls: TimerControls;
  compact?: boolean;
  formatTime?: (s: number) => string;
};

function defaultFormatTime(rawSeconds: number): string {
  const total = Math.max(0, Math.floor(Number(rawSeconds) || 0));

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const two = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${two(minutes)}:${two(seconds)}`;
  }
  return `${two(minutes)}:${two(seconds)}`;
}

function getPhaseIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("przerwa") || lower.includes("rest") || lower.includes("break"))
    return <Coffee className="h-5 w-5 text-accent sm:h-6 sm:w-6" />;
  if (lower.includes("ćwiczenia") || lower.includes("cwiczenia") || lower.includes("exercise"))
    return <Dumbbell className="h-5 w-5 text-primary-strong sm:h-6 sm:w-6" />;

  return <Target className="h-5 w-5 text-primary sm:h-6 sm:w-6" />;
}

function TimerControlButtons({ controls, running, paused, isMultiPhase }: Readonly<TimerControlButtonsProps>) {
  return (
    <div className="mt-2 flex w-full items-stretch justify-center gap-1.5 sm:gap-2">
      {controls.prev && (
        <button
          onClick={controls.prev}
          type="button"
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border bg-surface py-2 text-text-secondary transition-all hover:border-line hover:bg-surface-hover sm:py-3"
          title="Cofnij"
          aria-label="Cofnij"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs font-bold">Cofnij</span>
        </button>
      )}

      {controls.cancel && (
        <button
          onClick={controls.cancel}
          type="button"
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border bg-surface py-2 text-text-muted transition-colors hover:border-danger-line hover:bg-danger-soft hover:text-danger sm:py-3"
          title="Anuluj"
          aria-label="Anuluj"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs font-bold">Anuluj</span>
        </button>
      )}

      {running ? (
        <button
          onClick={controls.pause}
          type="button"
          className="flex flex-[1.5] flex-col items-center justify-center gap-1 rounded-xl border-transparent bg-secondary py-2 text-white shadow-sm transition-all hover:bg-secondary-hover active:scale-95 sm:py-3"
          title={paused ? "Wznów" : "Pauza"}
          aria-label={paused ? "Wznów" : "Pauza"}
        >
          {paused ? <Play className="h-5 w-5 sm:h-6 sm:w-6" /> : <Pause className="h-5 w-5 sm:h-6 sm:w-6" />}
          <span className="text-xs font-bold">{paused ? "Wznów" : "Pauza"}</span>
        </button>
      ) : (
        <button
          onClick={controls.start}
          type="button"
          className="flex flex-[1.5] flex-col items-center justify-center gap-1 rounded-xl border border-transparent bg-secondary py-2 text-white shadow-sm transition-all hover:bg-secondary-hover active:scale-95 sm:py-3"
          title="Start"
          aria-label="Start"
        >
          <Play className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-bold">Start</span>
        </button>
      )}

      {controls.stop && (
        <button
          onClick={controls.stop}
          type="button"
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border bg-surface py-2 text-text-muted transition-colors sm:py-3 ${
            isMultiPhase
              ? "hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
              : "hover:border-success/30 hover:bg-success-soft hover:text-success"
          }`}
          title={isMultiPhase ? "Zakończ" : "Zapisz do notatki"}
          aria-label={isMultiPhase ? "Zakończ" : "Zapisz do notatki"}
        >
          {isMultiPhase ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Save className="h-4 w-4 sm:h-5 sm:w-5" />}
          <span className="text-xs font-bold">{isMultiPhase ? "Stop" : "Zapisz"}</span>
        </button>
      )}

      {controls.next && (
        <button
          onClick={controls.next}
          type="button"
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border bg-surface py-2 text-text-secondary transition-all hover:border-line hover:bg-surface-hover sm:py-3"
          title="Dalej"
          aria-label="Dalej"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs font-bold">Dalej</span>
        </button>
      )}
    </div>
  );
}

export default function UniversalTimer({
  secondsLeft,
  running,
  paused,
  phaseIndex = 0,
  round = 1,
  phases,
  title,
  controls,
  compact = false,
  formatTime = defaultFormatTime,
}: Readonly<UniversalTimerProps>) {
  const isMultiPhase = !!(phases && phases.length > 0);
  const currentPhase = isMultiPhase ? phases[phaseIndex] : null;
  const nextPhase = isMultiPhase ? phases[phaseIndex + 1] : null;

  const displayLabel = title || currentPhase?.label || "Timer";

  return (
    <div
      className={`card mx-auto flex w-full max-w-md flex-col items-center rounded-card shadow-md transition-colors ${
        compact ? "gap-3 p-4 sm:gap-4" : "gap-6 p-6"
      }`}
    >
      <div className="w-full space-y-1 text-center">
        <h2
          className={`flex items-center justify-center gap-2 font-bold text-text ${compact ? "text-lg sm:text-xl" : "text-2xl"}`}
        >
          {getPhaseIcon(displayLabel)}
          <span className="truncate">{displayLabel}</span>
        </h2>

        {isMultiPhase && (
          <div className="text-xs font-semibold text-text-muted">
            {nextPhase ? `Następne: ${nextPhase.label}` : "Następne: Koniec"}
          </div>
        )}
      </div>

      <div className="w-full text-center">
        <div
          className={`font-mono leading-none font-bold tracking-tight text-primary tabular-nums ${
            compact ? "text-5xl sm:text-6xl" : "text-7xl"
          }`}
        >
          {formatTime(secondsLeft)}
        </div>

        {isMultiPhase && (
          <div className="mt-3 flex items-center justify-center gap-2 sm:mt-4">
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-text-secondary">
              Runda {round}
            </span>
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-text-secondary">
              Faza {phaseIndex + 1} / {phases.length}
            </span>
          </div>
        )}
      </div>

      <TimerControlButtons controls={controls} running={running} paused={paused} isMultiPhase={isMultiPhase} />
    </div>
  );
}
