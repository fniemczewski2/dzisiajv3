"use client";

import { useEffect, useState, useRef } from "react";
import {
  Play,
  Pause,
  X,
  Coffee,
  Target,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import Layout from "../../components/Layout";
import Head from "next/head";
import { useRouter } from "next/router";

export default function PomodoroPage() {
  const DEFAULT_FOCUS = 25;
  const DEFAULT_BREAK = 5;

  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK);
  const [open, setOpen] = useState(false); // <-- hidden by default

  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const toggleOpen = () => setOpen((prev) => !prev);

  useEffect(() => {
    if (!running && !isBreak) {
      setSecondsLeft(focusMinutes * 60);
    }
  }, [focusMinutes]);

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
      const nextIsBreak = !isBreak;
      setIsBreak(nextIsBreak);
      const nextTime = nextIsBreak ? breakMinutes : focusMinutes;
      setSecondsLeft(nextTime * 60);
    }
  }, [secondsLeft, running, isBreak, focusMinutes, breakMinutes]);

  const startSession = () => {
    setSecondsLeft((isBreak ? breakMinutes : focusMinutes) * 60);
    setRunning(true);
    setPaused(false);
  };

  const togglePause = () => setPaused((prev) => !prev);

  const cancelSession = () => {
    setRunning(false);
    setPaused(false);
    setIsBreak(false);
    setSecondsLeft(focusMinutes * 60);
  };

  const format = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleBack = () => {
    const pathParts = router.pathname.split("/").filter(Boolean);
    if (pathParts.length > 1) {
      const parentPath = "/" + pathParts.slice(0, -1).join("/");
      router.push(parentPath);
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <Head>
        <title>Pomodoro – Dzisiajv3</title>
      </Head>
      <Layout>
        <div className="flex justify-start gap-3 items-center mb-4 relative">
          <button
            onClick={handleBack}
            className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-semibold">Pomodoro</h2>
        </div>

        <div className="p-2 max-w-md mx-auto bg-white shadow rounded-xl flex flex-col items-center gap-6">
          <div className="flex flex-col w-full gap-3">
            <div className="text-center">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                {isBreak ? "Przerwa" : "Focus"}
                {isBreak ? <Coffee className="w-5 h-5" /> : <Target className="w-5 h-5" />}
              </h2>
              <div className="text-4xl font-mono mt-2">{format(secondsLeft)}</div>
            </div>

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
            <button
              onClick={toggleOpen}
              className="relative bottom-2 left-2 transition"
              aria-label="Ustawienia"
            >
              {open ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Settings
                  className="w-5 h-5 text-gray-600" />
              )}
            </button>

            
            {open && (
              <div
                className={`transition-all duration-300 overflow-hidden${
                  open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                  <label className="flex justify-between px-4 py-2 items-center">
                    Focus (min):
                    <input
                      type="number"
                      value={focusMinutes}
                      onChange={(e) => setFocusMinutes(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-20 text-right"
                      min={1}
                    />
                  </label>
                  <label className="flex justify-between px-4 py-2 items-center">
                    Break (min):
                    <input
                      type="number"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-20 text-right"
                      min={1}
                    />
                  </label>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
