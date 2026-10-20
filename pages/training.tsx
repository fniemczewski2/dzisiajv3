// pages/training.tsx

import React, { useState } from "react";
import UniversalTimer from "@/components/ui/Timer";
import { useIntervalTraining } from "@/hooks/useIntervalTraining";
import { X, Settings2 } from "lucide-react";
import Seo from "@/components/ui/SEO";

export default function TrainingPage() {
  const [workSec, setWorkSec] = useState(30);
  const [restSec, setRestSec] = useState(15);
  const [sets, setSets] = useState(8);
  const [cycles, setCycles] = useState(1);
  const [longRestSec, setLongRestSec] = useState(60);

  const useLongRest = cycles > 1;

  const cfg = {
    workSeconds: workSec,
    restSeconds: restSec,
    sets,
    cycles,
    longRestSeconds: useLongRest ? longRestSec : undefined,
    longRestAfterCycles: useLongRest ? 1 : undefined,
  };

  const { secondsLeft, running, paused, phaseIndex, round, start, pause, stop, next, prev, phases } =
    useIntervalTraining(cfg);

  const controls = {
    start,
    pause,
    stop,
    next,
    prev,
    jumpToPhase: (_i: number) => {},
  };

  return (
    <>
      <Seo
        title="Trening interwałowy"
        description="Stoper do treningów interwałowych, np. HIIT i Tabata. Ustaw czas pracy, przerwy i liczbę rund."
        canonical="https://dzisiaj.fun/training"
        keywords="trening, interwały, stoper, hiit, tabata, fitness"
      />
      <div className="space-y-6">
        <h1 className="page-title mb-6 w-full">Trening</h1>
        <div className="mx-auto max-w-sm">
          <UniversalTimer
            secondsLeft={secondsLeft}
            running={running}
            paused={paused}
            phaseIndex={phaseIndex}
            round={round}
            phases={phases}
            controls={controls}
          />

          {!running && !paused && (
            <div className="card mx-auto mt-8 max-w-sm p-6 shadow-sm transition-colors">
              <div className="mb-5 flex items-center gap-2 border-b border-line pb-3">
                <Settings2 className="h-5 w-5 text-text-muted" />
                <h3 className="text-sm font-bold text-text">Konfiguracja interwałów</h3>
              </div>

              <div className="space-y-4">
                <div className="flex w-full items-center justify-between">
                  <label htmlFor="work_time" className="text-sm font-medium text-text-secondary">
                    Czas pracy:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="work_time"
                      type="number"
                      min={1}
                      max={600}
                      value={workSec}
                      onChange={(e) => setWorkSec(Number(e.target.value))}
                      className="input-field w-20 py-1.5 text-center tabular-nums"
                    />
                    <span className="w-8 text-xs font-semibold text-text-muted">sek</span>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between">
                  <label htmlFor="short_break" className="text-sm font-medium text-text-secondary">
                    Krótka przerwa:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="short_break"
                      type="number"
                      min={0}
                      max={600}
                      value={restSec}
                      onChange={(e) => setRestSec(Number(e.target.value))}
                      className="input-field w-20 py-1.5 text-center tabular-nums"
                    />
                    <span className="w-8 text-xs font-semibold text-text-muted">sek</span>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between">
                  <span>
                    <label htmlFor="series" className="text-sm font-medium text-text-secondary">
                      Serie
                    </label>
                    <span className="text-sm font-medium text-text-secondary"> i </span>
                    <label htmlFor="cycles" className="text-sm font-medium text-text-secondary">
                      Cykle:
                    </label>
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="series"
                      type="number"
                      min={1}
                      max={50}
                      value={sets}
                      onChange={(e) => setSets(Number(e.target.value))}
                      className="input-field w-16 py-1.5 text-center tabular-nums"
                      title="Ilość ćwiczeń w jednym cyklu"
                    />
                    <X className="h-4 w-4 text-text-muted" />
                    <input
                      id="cycles"
                      type="number"
                      min={1}
                      max={20}
                      value={cycles}
                      onChange={(e) => setCycles(Number(e.target.value))}
                      className="input-field w-16 py-1.5 text-center tabular-nums"
                      title="Ilość powtórzeń całego cyklu"
                    />
                  </div>
                </div>
                {cycles > 1 && (
                  <div className="flex w-full animate-in items-center justify-between fade-in slide-in-from-top-2">
                    <label htmlFor="long_break" className="text-sm font-medium text-text-secondary">
                      Długa przerwa:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="long_break"
                        type="number"
                        min={0}
                        max={600}
                        value={longRestSec}
                        onChange={(e) => setLongRestSec(Number(e.target.value))}
                        className="input-field w-20 py-1.5 text-center tabular-nums"
                      />
                      <span className="w-8 text-xs font-semibold text-text-muted">sek</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
