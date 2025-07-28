"use client";

import { useEffect, useState } from "react";
import { Task } from "../../types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Play, Pause, StopCircle, XCircle, X, Save } from "lucide-react";

interface Props {
  task: Task;
  onComplete: () => void;
}

export default function TaskTimer({ task, onComplete }: Props) {
  const supabase = useSupabaseClient();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (running && !paused) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval!);
  }, [running, paused]);

  const stopTimer = async () => {
    setRunning(false);
    setPaused(false);
    const minutes = Math.floor(seconds / 60);
    const newNote = `Czas: ${minutes} min`;
    const updatedDesc = [task.description || "", newNote].filter(Boolean).join("\n");

    await supabase
      .from("tasks")
      .update({ description: updatedDesc })
      .eq("id", task.id);

    onComplete();
  };

  const cancelTimer = () => {
    setRunning(false);
    setPaused(false);
    setSeconds(0);
    onComplete();
  };

  const togglePause = () => setPaused((p) => !p);

  const format = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="p-4 bg-white shadow rounded-xl flex flex-col items-center gap-3">
      <h4 className="font-semibold text-center">{task.title}</h4>
      <div className="text-3xl font-mono">{format(seconds)}</div>

      <div className="flex flex-wrap gap-2 justify-center">
        {!running ? (
          <button
            onClick={() => {
              setRunning(true);
              setPaused(false);
            }}
            className="py-1 px-2 text-primary flex flex-col items-center gap-1 hover:text-secondary transition"
          >
            <Play className="w-5 h-5" />
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
                  <Play className="w-5 h-5" />
                  <span className="text-xs">Wznów</span>
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5" />
                  <span className="text-xs">Pauza</span>
                </>
              )}
            </button>
            <button
              onClick={stopTimer}
              className="py-1 px-2 text-primary flex flex-col items-center gap-1 hover:text-secondary transition"
            >
              <Save className="w-5 h-5" />
              <span className="text-xs">Zapisz</span>
            </button>
          </>
        )}

        <button
          onClick={cancelTimer}
          className="py-1 px-2 text-red-500 flex flex-col items-center gap-1 hover:text-red-600 transition"
        >
            <X className="w-5 h-5" />
          <span className="text-xs">Anuluj</span>
        </button>
      </div>
    </div>
  );
}
