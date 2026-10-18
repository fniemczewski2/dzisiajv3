// components/widgets/MoodTracker.tsx

import { readableTextColor } from "@/lib/contrast";
import { DEFAULT_MOODS } from "@/config/defaults";
import React from "react";
import { useMoods } from "@/hooks/db/useMoods";
import { Check, Smile } from "lucide-react";
import { useSettings } from "@/hooks/db/useSettings";

interface MoodWidgetProps {
  date: string;
}

export default function MoodWidget({ date }: Readonly<MoodWidgetProps>) {
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
      <h3 className="flex items-center font-medium text-text">
        <span className="mr-3 text-primary">
          <Smile className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <span>Nastrój</span>
      </h3>
      <div className="flex flex-nowrap gap-1 md:gap-2">
        {options.map((opt) => {
          const isSelected = todayMood?.mood_id === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleClick(opt.id)}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Nastrój: ${opt.label}`}
              className={`group flex h-11 min-w-11 flex-1 items-center justify-center rounded-full px-2.5 text-xs font-semibold transition md:px-3 ${
                isSelected ? "ring-2 ring-text ring-offset-2 ring-offset-card" : "hover:ring-2 hover:ring-line-strong"
              }`}
              style={{ backgroundColor: opt.color, color: readableTextColor(opt.color) }}
              title={opt.label}
            >
              {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              <span className="hidden md:group-hover:block">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
