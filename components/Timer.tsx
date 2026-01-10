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

  const iconForLabel = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes("przerwa") || lower.includes("rest") || lower.includes("break"))
      return <Coffee className="w-5 h-5" />;
    if (lower.includes("focus") || lower.includes("work")) return <Target className="w-5 h-5" />;
    if (lower.includes("ćwiczenia") || lower.includes("cwiczenia") || lower.includes("exercise"))
      return <Dumbbell className="w-5 h-5" />;
    return <Repeat className="w-5 h-5" />;
  };

  return (
    <div className="p-2 max-w-md mx-auto bg-white shadow rounded-xl flex flex-col items-center gap-4">
      <div className="text-center w-full">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          {iconForLabel(current.label)}
          <span>{current.label}</span>
        </h2>
        <div className="text-xs text-gray-500">
          {nextPhase ? `Następne: ${nextPhase.label}` : "Następne: Koniec"}
        </div>

        <div className={`text-5xl font-mono mt-2 ${compact ? "text-3xl" : ""}`}>
          {formatTime(secondsLeft)}
        </div>

        <div className="text-sm text-gray-500 mt-1">
          <span className="mr-2">Runda: {round}</span>
          <span>Faza: {phaseIndex + 1}/{phases.length}</span>
        </div>
      </div>

      <div className="w-full">
        {showControls && (
          <div className="flex gap-2 justify-center items-center">
            <button
              onClick={controls.prev}
              className="py-2 px-3 flex flex-1 flex-col items-center gap-1 border rounded hover:bg-gray-50"
              aria-label="Previous phase"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs">Cofnij</span>
            </button>
            {!running ? (
              <button
                onClick={controls.start}
                className="py-2 px-4 flex flex-1 flex-col items-center gap-1 text-primary border rounded hover:bg-gray-50"
                aria-label="Start"
              >
                <Play className="w-5 h-5" />
                <span className="text-xs">Start</span>
              </button>
            ) : (
              <>
                <button
                  onClick={controls.pause}
                  className="py-2 px-3 flex flex-1 flex-col items-center gap-1 border rounded hover:bg-gray-50"
                  aria-label={paused ? "Wznów" : "Pauza"}
                >
                  {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  <span className="text-xs">{paused ? "Wznów" : "Pauza"}</span>
                </button>

                <button
                  onClick={controls.stop}
                  className="py-2 px-3 flex flex-1 flex-col items-center gap-1 border rounded hover:bg-gray-50 text-red-600"
                  aria-label="Stop"
                >
                  <X className="w-5 h-5" />
                  <span className="text-xs">Stop</span>
                </button>
              </>
            )}

            

            <button
              onClick={controls.next}
              className="py-2 px-3 flex flex-1 flex-col items-center gap-1 border rounded hover:bg-gray-50"
              aria-label="Next phase"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-xs">Dalej</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
