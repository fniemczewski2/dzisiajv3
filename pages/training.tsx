"use client";

import React, { useState } from "react";
import UniversalTimer from "../components/Timer";
import { useIntervalTraining } from "../hooks/useIntervalTraining";
import { X, Settings2 } from "lucide-react";
import Seo from "../components/SEO";

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

  const {
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
    phases,
  } = useIntervalTraining(cfg);

  const controls = {
    start,
    pause,
    stop,
    next,
    prev,
    jumpToPhase: (i: number) => {},
  };

  return (
    <>
      <Seo
        title="Trening Interwałowy - Dzisiaj v3"
        description="Ćwicz z wbudowanym stoperem. Skonfiguruj własne czasy pracy i przerw do treningów HIIT i Tabata."
        canonical="https://dzisiajv3.vercel.app/training"
        keywords="trening, interwały, stoper, hiit, tabata, fitness"
      />
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-text mb-6">Trening</h2>

          <UniversalTimer
            secondsLeft={secondsLeft}
            running={running}
            paused={paused}
            phaseIndex={phaseIndex}
            round={round}
            phases={phases}
            controls={controls}
          />

          {(!running && !paused) && (
            <div className="p-6 card rounded-2xl shadow-sm transition-colors mt-8 max-w-sm mx-auto">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                <Settings2 className="w-5 h-5 text-textMuted" />
                <h3 className="font-bold text-text uppercase tracking-wider text-sm">
                  Konfiguracja interwałów
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex w-full items-center justify-between">
                  <label htmlFor="work_time" className="font-medium text-textSecondary text-sm">Czas pracy:</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="work_time"
                      type="number"
                      min={1}
                      max={600}
                      value={workSec}
                      onChange={(e) => setWorkSec(Number(e.target.value))}
                      className="input-field w-20 text-center tabular-nums py-1.5"
                    />
                    <span className="text-xs font-semibold text-textMuted uppercase tracking-wider w-8">sek</span>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between">
                  <label htmlFor="short_break" className="font-medium text-textSecondary text-sm">Krótka przerwa:</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="short_break"
                      type="number"
                      min={0}
                      max={600}
                      value={restSec}
                      onChange={(e) => setRestSec(Number(e.target.value))}
                      className="input-field w-20 text-center tabular-nums py-1.5"
                    />
                    <span className="text-xs font-semibold text-textMuted uppercase tracking-wider w-8">sek</span>
                  </div>
                </div>

 
                <div className="flex w-full items-center justify-between">
                  <span>
                    <label htmlFor="series" className="font-medium text-textSecondary text-sm">Serie</label>
                    <span className="font-medium text-textSecondary text-sm"> i </span>
                    <label htmlFor="cycles" className="font-medium text-textSecondary text-sm">Cykle:</label>
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="series"
                      type="number"
                      min={1}
                      max={50}
                      value={sets}
                      onChange={(e) => setSets(Number(e.target.value))}
                      className="input-field w-16 text-center tabular-nums py-1.5"
                      title="Ilość ćwiczeń w jednym cyklu"
                    />
                    <X className="w-4 h-4 text-textMuted" />
                    <input
                      id="cycles"
                      type="number"
                      min={1}
                      max={20}
                      value={cycles}
                      onChange={(e) => setCycles(Number(e.target.value))}
                      className="input-field w-16 text-center tabular-nums py-1.5"
                      title="Ilość powtórzeń całego cyklu"
                    />
                  </div>
                </div>
                {cycles > 1 && (
                  <div className="flex w-full items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <label htmlFor="long_break" className="font-medium text-textSecondary text-sm">Długa przerwa:</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="long_break"
                        type="number"
                        min={0}
                        max={600}
                        value={longRestSec}
                        onChange={(e) => setLongRestSec(Number(e.target.value))}
                        className="input-field w-20 text-center tabular-nums py-1.5"
                      />
                      <span className="text-xs font-semibold text-textMuted uppercase tracking-wider w-8">sek</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </>
  );
}