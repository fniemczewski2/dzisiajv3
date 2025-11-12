"use client";

import React, { useState } from "react";
import UniversalTimer, { TimerPhase } from "../components/Timer";
import { useIntervalTraining } from "../hooks/useIntervalTraining";
import Layout from "../components/Layout";
import Head from "next/head";
import { X } from "lucide-react";

export default function TrainingPage() {
  // default interval config (example Tabata-like)
  const [workMin, setWorkMin] = useState(0);
  const [workSec, setWorkSec] = useState(30);
  const [restSec, setRestSec] = useState(15);
  const [sets, setSets] = useState(8);
  const [cycles, setCycles] = useState(1);
  const [longRestSec, setLongRestSec] = useState(60);
  const [useLongRest, setUseLongRest] = useState(false);

  const cfg = {
    workSeconds: workMin * 60 + workSec,
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
      <Head>
        <title>Trening – Dzisiajv3</title>
      </Head>
      <Layout>
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <h1 className="text-xl font-semibold">Trening</h1>
          <UniversalTimer
            secondsLeft={secondsLeft}
            running={running}
            paused={paused}
            phaseIndex={phaseIndex}
            round={round}
            phases={phases}
            controls={controls}
            showControls={true}
          />
          <div className="flex flex-wrap justify-between gap-2 p-4 max-w-[400px] sm:max-w-[480px] w-full my-1 sm:mx-2 hover:shadow-lg hover:bg-gray-100 bg-card rounded-xl shadow">
            <div className="flex w-full justify-between">
            <h2>Ćwiczenia: </h2>
            <label className="text-sm">
              <input
                type="number"
                min={0}
                max={120}
                value={workSec}
                onChange={(e) => setWorkSec(Number(e.target.value))}
                className="border rounded px-2 py-1 mr-2 text-right"
              />
              sekund
            </label>
            </div>
            <div className="flex w-full items-center justify-between">
            <h2>Przerwy: </h2>
            <label className="text-sm">
              <input
                type="number"
                min={0}
                max={120}
                value={restSec}
                onChange={(e) => setRestSec(Number(e.target.value))}
                className="border rounded px-2 py-1 mr-2 text-right"
              />
              sekund
            </label>
            </div>
            <div className="w-full flex items-center justify-between">
            <h2>Powtórzenia: </h2>
            <div className="flex items-center gap-1">
            <label className="text-sm">
              <input
                type="number"
                min={1}
                max={20}
                value={sets}
                onChange={(e) => setSets(Number(e.target.value))}
                className="border rounded px-2 py-1"
              />
              
            </label>
            <X className="w-[11px] h-[11px] text-gray-500" />
            <label className="text-sm">
              <input
                type="number"
                min={1}
                max={10}
                value={cycles}
                onChange={(e) => setCycles(Number(e.target.value))}
                className="border rounded px-2 py-1"
              />
            
            </label>
            </div>
            </div>
            <div className="w-full flex items-center justify-between">
            <h2>Długa przerwa: </h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={longRestSec}
                  onChange={(e) => setLongRestSec(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                />
                sekund
              </label>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
