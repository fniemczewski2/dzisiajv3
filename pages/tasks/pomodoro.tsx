"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Pause, StopCircle, XCircle, X, Coffee, Target } from "lucide-react";
import Layout from "../../components/Layout";
import Head from "next/head";

export default function PomodoroPage() {
  const focusDuration = 25 * 60; // 25 min
  const breakDuration = 5 * 60;  // 5 min

  const [secondsLeft, setSecondsLeft] = useState(focusDuration);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current as NodeJS.Timeout);
  }, [running, paused]);

  useEffect(() => {
    if (secondsLeft <= 0 && running) {
      setRunning(false);
      setPaused(false);
      setIsBreak((prev) => !prev);
      setSecondsLeft(isBreak ? focusDuration : breakDuration);
    }
  }, [secondsLeft, running, isBreak]);

  const startSession = () => {
    setRunning(true);
    setPaused(false);
  };

  const togglePause = () => setPaused((prev) => !prev);

  const cancelSession = () => {
    setRunning(false);
    setPaused(false);
    setIsBreak(false);
    setSecondsLeft(focusDuration);
  };

  const format = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
    <Head>
      <title>Pomodoro – Dzisiajv3</title>
    </Head>
    <Layout>
    <div className="p-6 max-w-md mx-auto bg-white shadow rounded-xl flex flex-col items-center gap-4">
      <h2 className="text-xl font-bold text-center">
        <h2 className="text-xl font-bold text-center flex items-center justify-center gap-2">
          {isBreak ? "Przerwa" : "Focus"}
          {isBreak ? <Coffee className="w-5 h-5" /> : <Target className="w-5 h-5" />}
        </h2>
      </h2>
      <div className="text-4xl font-mono">{format(secondsLeft)}</div>

      <div className="flex flex-wrap gap-3 justify-center">
        {!running ? (
          <button
            onClick={startSession}
            className="py-1 px-2 text-primary flex flex-col items-center gap-1 hover:text-secondary transition"
          >
            <Play className="w-6 h-6" />
            <span className="text-xs">Start</span>
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              className="py-1 px-2 text-green-600 flex flex-col items-center gap-1 hover:bg-gray-100 transition"
            >
              {paused ? (
                <>
                  <Play className="w-6 h-6" />
                  <span className="text-xs">Wznów</span>
                </>
              ) : (
                <>
                  <Pause className="w-6 h-6" />
                  <span className="text-xs">Pauza</span>
                </>
              )}
            </button>
            <button
              onClick={cancelSession}
              className="py-1 px-2 text-red-500 flex flex-col items-center gap-1 hover:text-red-600 transition"
            >
              <X className="w-6 h-6" />
              <span className="text-xs">Anuluj</span>
            </button>
          </>
        )}
      </div>
    </div>
    </Layout>
    </>
  );
}
