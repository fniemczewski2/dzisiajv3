"use client";

import React from "react";
import { useMoods } from "../../hooks/useMoods";
import { Check, Smile } from "lucide-react";
import { useSettings } from "../../hooks/useSettings";

export const DEFAULT_MOODS = [
  { id: "m1", label: "Spokojnie", color: "#22c55e" },
  { id: "m2", label: "Męcząco",   color: "#3b82f6" },
  { id: "m3", label: "Neutralnie",color: "#eab308" },
  { id: "m4", label: "Radośnie",  color: "#f97316" },
  { id: "m5", label: "Nerwowo",   color: "#ef4444" },
  { id: "m6", label: "Smutno",    color: "#a855f7" },
];

interface MoodWidgetProps {
  date: string;
}

export default function MoodWidget({ date }: MoodWidgetProps) {
  const { settings } = useSettings();
  const { moods, logMood, loading } = useMoods(date, date);
  const todayMood = moods.find((m) => m.date === date);

  if (!settings?.show_mood_tracker || loading) return null;

  const options = settings?.mood_options?.length ? settings.mood_options : DEFAULT_MOODS;

  const handleClick = (mood_id: string) => {
    const next = todayMood?.mood_id === mood_id ? null : mood_id;
    logMood(date, next).catch(console.error);
  };

  return (
    <div className="widget flex items-center justify-between px-4 py-3">
      <h3 className="flex font-medium items-center text-text">
        <span className="text-primary mr-3">
          <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
        </span>
        Nastrój
      </h3>
      <div className="flex flex-nowrap gap-1 md:gap-2">
        {options.map((opt) => {
          const isSelected = todayMood?.mood_id === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleClick(opt.id)}
              className={`group px-2.5 py-1 md:px-3 md:py-1.5 flex items-center flex-1 h-[24px] rounded-full text-xs font-semibold text-white shadow-sm transition hover:scale-105 active:scale-95
                ${isSelected ? "opacity-100 scale-110" : "opacity-60 hover:opacity-80"}`}
              style={{ backgroundColor: opt.color }}
              title={opt.label}
            >
              {isSelected && <span><Check className="w-3.5 h-3.5 mt-0.5" /></span>}
              <span className="hidden md:group-hover:block transition">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}