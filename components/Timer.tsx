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
  Save,
} from "lucide-react";

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
}: UniversalTimerProps) {
  
  const isMultiPhase = phases && phases.length > 0;
  const currentPhase = isMultiPhase ? phases[phaseIndex] : null;
  const nextPhase = isMultiPhase ? phases[phaseIndex + 1] : null;
  
  const displayLabel = title || currentPhase?.label || "Timer";

  const getIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes("przerwa") || lower.includes("rest") || lower.includes("break"))
      return <Coffee className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />;
    if (lower.includes("ćwiczenia") || lower.includes("cwiczenia") || lower.includes("exercise"))
      return <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />;
    if (isMultiPhase)
      return <Repeat className="w-5 h-5 sm:w-6 sm:h-6 text-textMuted" />;
      
    // Domyślna ikona dla zadań
    return <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />;
  };

  return (
    <div 
      className={`w-full max-w-md mx-auto bg-card border border-gray-200 dark:border-gray-700 shadow-md rounded-2xl flex flex-col items-center transition-colors ${
        compact ? "p-4 gap-3 sm:gap-4" : "p-6 gap-6"
      }`}
    >
      {/* Nagłówek */}
      <div className="text-center w-full space-y-1">
        <h2 className={`font-bold flex items-center justify-center gap-2 text-text ${compact ? "text-lg sm:text-xl" : "text-2xl"}`}>
          {getIcon(displayLabel)}
          <span className="truncate">{displayLabel}</span>
        </h2>
        
        {/* Pokaż następną fazę tylko w trybie wielofazowym */}
        {isMultiPhase && (
          <div className="text-[10px] sm:text-xs font-semibold text-textMuted uppercase tracking-wider">
            {nextPhase ? `Następne: ${nextPhase.label}` : "Następne: Koniec"}
          </div>
        )}
      </div>

      {/* Główny licznik czasu */}
      <div className="text-center w-full">
        <div 
          className={`font-mono font-bold text-primary tracking-tight tabular-nums leading-none ${
            compact ? "text-5xl sm:text-6xl" : "text-7xl"
          }`}
        >
          {formatTime(secondsLeft)}
        </div>
        
        {/* Odznaki (Pills) tylko dla trybu wielofazowego */}
        {isMultiPhase && (
          <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
            <span className="bg-surface text-textSecondary text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border border-gray-200 dark:border-gray-700">
              Runda {round}
            </span>
            <span className="bg-surface text-textSecondary text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border border-gray-200 dark:border-gray-700">
              Faza {phaseIndex + 1} / {phases.length}
            </span>
          </div>
        )}
      </div>
        <div className="w-full flex gap-1.5 sm:gap-2 justify-center items-stretch mt-2">
          
          {controls.prev && (
            <button
              onClick={controls.prev}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 sm:py-3 bg-surface hover:bg-surfaceHover text-textSecondary border hover:border-gray-200 dark:hover:border-gray-700 rounded-xl transition-all"
              title="Cofnij"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Cofnij</span>
            </button>
          )}

          {/* Opcjonalny przycisk anulowania (przydatny w stoperze zadań) */}
          {controls.cancel && (
            <button
              onClick={controls.cancel}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 sm:py-3 bg-surface hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 rounded-xl transition-colors border hover:border-red-200 dark:hover:border-red-900/30"
              title="Anuluj"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Anuluj</span>
            </button>
          )}

          {/* Główny przycisk (Start / Pauza) */}
          {!running ? (
            <button
              onClick={controls.start}
              className="flex flex-[1.5] flex-col items-center justify-center gap-1 py-2 sm:py-3 bg-primary hover:bg-secondary border border-transparent text-white rounded-xl shadow-sm transition-all active:scale-95"
              title="Start"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Start</span>
            </button>
          ) : (
            <button
              onClick={controls.pause}
              className={`flex flex-[1.5] flex-col items-center justify-center gap-1 py-2 sm:py-3 text-white rounded-xl shadow-sm transition-all active:scale-95 bg-primary hover:bg-secondary border-transparent" 
              }`}
              title={paused ? "Wznów" : "Pauza"}
            >
              {paused ? <Play className="w-5 h-5 sm:w-6 sm:h-6" /> : <Pause className="w-5 h-5 sm:w-6 sm:h-6" />}
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{paused ? "Wznów" : "Pauza"}</span>
            </button>
          )}

          {controls.stop && (
            <button
              onClick={controls.stop}
              className={`flex flex-1 flex-col items-center justify-center bg-surface gap-1 py-2 sm:py-3 rounded-xl transition-colors text-textMuted border ${
                isMultiPhase
                  ? "hover:border-red-600/30 hover:dark:border-red-400/30 hover:text-red-600 hover:dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                  : "hover:border-green-600/30 hover:dark:border-green-400/30 hover:text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
              }`}
              title={isMultiPhase ? "Zakończ" : "Zapisz do notatki"}
            >
              {isMultiPhase ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                {isMultiPhase ? "Stop" : "Zapisz"}
              </span>
            </button>
          )}

          {controls.next && (
            <button
              onClick={controls.next}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 sm:py-3 bg-surface hover:bg-surfaceHover text-textSecondary border rounded-xl transition-all"
              title="Dalej"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Dalej</span>
            </button>
          )}
          
        </div>
    </div>
  );
}