"use client";

import {
  Pill, Bath, Dumbbell, Users,
  Briefcase, Home, Leaf, Languages,
} from "lucide-react";
import { useDailyHabits } from "../../hooks/useDailyHabits";
import { useSettings } from "../../hooks/useSettings";
import LoadingState from "../LoadingState";
import type { HabitKey } from "../../types";
import { useToast } from "../../providers/ToastProvider";
import { useEffect } from "react";

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

interface HabbitIconsProps {
  date?: string;
}

export default function HabbitIcons({ date }: HabbitIconsProps) {
  const { habits, loading: habitsLoading, toggleHabit } = useDailyHabits(date);
  const { settings, loading: settingsLoading } = useSettings();
  const { toast } = useToast();

  useEffect(() => {
      let toastId: string | undefined;
      if (settingsLoading || habitsLoading || !habits || !settings) toastId = toast.loading("Ładowanie nawyków...");
      return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [settingsLoading, habitsLoading, toast]);

  if (habitsLoading || settingsLoading || !habits || !settings) {
    return null;
  }

  const activeItems = items.filter(({ key }) => {
    const settingKey = `habit_${key}` as keyof typeof settings;
    return settings[settingKey] !== false; 
  });

  return (
    <div className="flex flex-nowrap justify-between md:justify-start gap-1 sm:gap-2 mb-2 sm:mb-4">
      {activeItems.map(({ key, Icon }) => {
        const isActive = habits![key];
        
        return (
          <button
            key={key}
            title={key}
            disabled={habitsLoading}
            onClick={() => toggleHabit(key)}
            className={`
              p-2 sm:p-3 flex-1 min-w-[32px] max-w-[80px] sm:max-w-none rounded-xl border transition-colors flex justify-center items-center
              ${isActive 
                ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 shadow-sm" 
                : "card text-textSecondary hover:bg-surface hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              }
              ${habitsLoading ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        );
      })}
    </div>
  );
}