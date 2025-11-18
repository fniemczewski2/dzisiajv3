// components/tasks/TaskIcons.tsx
"use client";

import {
  Pill,
  Bath,
  Dumbbell,
  Users,
  Briefcase,
  Home,
  Leaf,
  Languages,
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

  if (!habits) {
    return (
      <LoadingState/>
    );
  }

  return (
    <div className="grid grid-cols-8 gap-2 mb-2">
      {items.map(({ key, Icon }) => (
        <button
          key={key}
          title={key}
          disabled={loading}
          onClick={() => toggleHabit(key)}
          className={`
            p-1.5 bg-card rounded-xl shadow sm:p-3 border text-center
            ${habits[key] ? "bg-green-200" : ""}
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 mx-auto" />
        </button>
      ))}
    </div>
  );
}