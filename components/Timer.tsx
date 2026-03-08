import React from "react";
import {
  Play,
  Pause,
  X,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Target,
  Repeat,
  Dumbbell,
} from "lucide-react";

export type TimerPhase = {
  id?: string;
  label: string;
  seconds: number;
};

export type TimerControls = {
  start: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  jumpToPhase: (index: number) => void;
};

export type TimerViewProps = {
  secondsLeft: number;
  running: boolean;
  paused: boolean;
  phaseIndex: number;
  round: number;
  phases: TimerPhase[];
  controls: TimerControls;
  showControls?: boolean;
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

export default function UniversalTimer({
  secondsLeft,
  running,
  paused,
  phaseIndex,
  round,
  phases,
  controls,
  showControls = true,
  compact = false,
  formatTime = defaultFormatTime,
}: TimerViewProps) {
  const current = phases[phaseIndex] ?? { label: "", seconds: 0 };
  const nextPhase = phases[phaseIndex + 1];

  const getIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes("przerwa") || lower.includes("rest") || lower.includes("break"))
      return <Coffee className="w-6 h-6 text-accent" />;
    if (lower.includes("focus") || lower.includes("work")) 
      return <Target className="w-6 h-6 text-primary" />;
    if (lower.includes("ćwiczenia") || lower.includes("cwiczenia") || lower.includes("exercise"))
      return <Dumbbell className="w-6 h-6 text-secondary" />;
    return <Repeat className="w-6 h-6 text-textMuted" />;
  };

  return (
    <div 
      className={`w-full max-w-md mx-auto bg-card border border-gray-200 dark:border-gray-700 shadow-md rounded-2xl flex flex-col items-center transition-colors ${
        compact ? "p-4 gap-4" : "p-6 gap-6"
      }`}
    >
      {/* Nagłówek fazy */}
      <div className="text-center w-full space-y-1">
        <h2 className={`font-bold flex items-center justify-center gap-2 text-text ${compact ? "text-xl" : "text-2xl"}`}>
          {getIcon(current.label)}
          <span>{current.label || "Koniec"}</span>
        </h2>
        <div className="text-xs font-semibold text-textMuted uppercase tracking-wider">
          {nextPhase ? `Następne: ${nextPhase.label}` : "Następne: Koniec"}
        </div>
      </div>

      {/* Główny licznik czasu */}
      <div className="text-center w-full">
        <div 
          className={`font-mono font-bold text-primary tracking-tight tabular-nums ${
            compact ? "text-6xl" : "text-7xl"
          }`}
        >
          {formatTime(secondsLeft)}
        </div>
        
        {/* Odznaki (Pills) z informacjami */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="bg-surface text-textSecondary text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide border border-gray-200 dark:border-gray-700">
            Runda {round}
          </span>
          <span className="bg-surface text-textSecondary text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide border border-gray-200 dark:border-gray-700">
            Faza {phaseIndex + 1} / {Math.max(1, phases.length)}
          </span>
        </div>
      </div>

      {/* Przyciski sterujące */}
      {showControls && (
        <div className="w-full flex gap-2 justify-center items-stretch mt-2">
          
          <button
            onClick={controls.prev}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 bg-surface hover:bg-surfaceHover text-textSecondary rounded-xl transition-colors"
            aria-label="Cofnij"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Cofnij</span>
          </button>

          {!running ? (
            <button
              onClick={controls.start}
              className="flex flex-[1.5] flex-col items-center justify-center gap-1 py-3 bg-primary hover:bg-secondary text-white rounded-xl shadow-sm transition-colors"
              aria-label="Start"
            >
              <Play className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Start</span>
            </button>
          ) : (
            <>
              <button
                onClick={controls.pause}
                className="flex flex-[1.5] flex-col items-center justify-center gap-1 py-3 bg-accent hover:opacity-90 text-white rounded-xl shadow-sm transition-colors"
                aria-label={paused ? "Wznów" : "Pauza"}
              >
                {paused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">{paused ? "Wznów" : "Pauza"}</span>
              </button>

              <button
                onClick={controls.stop}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                aria-label="Stop"
              >
                <X className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
              </button>
            </>
          )}

          <button
            onClick={controls.next}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 bg-surface hover:bg-surfaceHover text-textSecondary rounded-xl transition-colors"
            aria-label="Dalej"
          >
            <ChevronRight className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Dalej</span>
          </button>
          
        </div>
      )}
    </div>
  );
}