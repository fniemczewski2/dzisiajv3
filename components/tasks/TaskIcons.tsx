"use client";

import {
  Pill, Bath, Dumbbell, Users,
  Briefcase, Home, Leaf, Languages,
} from "lucide-react";
import { useDailyHabits } from "../../hooks/useDailyHabits";
import LoadingState from "../LoadingState";
import type { HabitKey } from "../../types";

const items: { key: HabitKey; Icon: React.ComponentType<any> }[] = [
  { key: "pills", Icon: Pill },
  { key: "bath", Icon: Bath },
  { key: "workout", Icon: Dumbbell },
  { key: "friends", Icon: Users },
  { key: "work", Icon: Briefcase },
  { key: "housework", Icon: Home },
  { key: "plants", Icon: Leaf },
  { key: "duolingo", Icon: Languages },
];

interface TaskIconsProps {
  date?: string;
}

export default function TaskIcons({ date }: TaskIconsProps) {
  const { habits, loading, toggleHabit } = useDailyHabits(date);

  if (!habits) return <LoadingState />;

  return (
    <div className="grid grid-cols-8 gap-1 sm:gap-2 mb-4">
      {items.map(({ key, Icon }) => {
        const isActive = habits[key];
        
        return (
          <button
            key={key}
            title={key}
            disabled={loading}
            onClick={() => toggleHabit(key)}
            className={`
              p-2 sm:p-3 rounded-xl border transition-colors flex justify-center items-center
              ${isActive 
                ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 shadow-sm" 
                : "bg-card border-gray-200 dark:border-gray-700 text-textSecondary hover:bg-surface hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              }
              ${loading ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        );
      })}
    </div>
  );
}