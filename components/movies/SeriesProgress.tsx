// components/movies/SeriesProgress.tsx

import React from "react";
import { Minus, Plus, SkipForward } from "lucide-react";

interface SeriesProgressProps {
  season: number | null | undefined;
  episode: number | null | undefined;
  seasonsCount: number | null | undefined;
  onChange: (season: number, episode: number) => void;
  disabled?: boolean;
}

/** Gdzie jestem w serialu: sezon + ostatni obejrzany odcinek (0 = jeszcze nie zacząłem sezonu). */
export default function SeriesProgress({
  season,
  episode,
  seasonsCount,
  onChange,
  disabled,
}: Readonly<SeriesProgressProps>) {
  const s = season ?? 1;
  const e = episode ?? 0;
  const maxSeason = seasonsCount && seasonsCount > 0 ? seasonsCount : null;
  const canNextSeason = maxSeason === null || s < maxSeason;
  const btn =
    "p-1.5 rounded-lg bg-surface border border-line text-text-secondary hover:text-text hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="mb-3 rounded-lg border border-line bg-surface p-2.5">
      <p className="mb-1.5 text-xs font-bold text-text-muted">Postęp oglądania</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-secondary">Sezon</span>
          <button
            type="button"
            className={btn}
            disabled={disabled || s <= 1}
            onClick={() => onChange(s - 1, 0)}
            aria-label="Poprzedni sezon"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-6 text-center font-bold text-text tabular-nums" aria-live="polite">
            {s}
            {maxSeason ? <span className="font-normal text-text-muted">/{maxSeason}</span> : null}
          </span>
          <button
            type="button"
            className={btn}
            disabled={disabled || !canNextSeason}
            onClick={() => onChange(s + 1, 0)}
            aria-label="Następny sezon"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-secondary">Odcinek</span>
          <button
            type="button"
            className={btn}
            disabled={disabled || e <= 0}
            onClick={() => onChange(s, e - 1)}
            aria-label="Cofnij odcinek"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-6 text-center font-bold text-text tabular-nums" aria-live="polite">
            {e}
          </span>
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => onChange(s, e + 1)}
            aria-label="Obejrzałem kolejny odcinek"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {canNextSeason && e > 0 && (
          <button
            type="button"
            className={`${btn} flex items-center gap-1 px-2 text-xs font-medium`}
            disabled={disabled}
            onClick={() => onChange(s + 1, 0)}
          >
            <SkipForward className="h-3.5 w-3.5" /> Kolejny sezon
          </button>
        )}
      </div>
    </div>
  );
}
