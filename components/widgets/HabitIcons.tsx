// components/widgets/HabitIcons.tsx
//
// Nawyki dnia jako przyciski-przełączniki (aria-pressed). Lista pochodzi
// z ustawień: własne nawyki albo domyślne. Nazwa nawyku jest widoczna
// pod ikoną – sama ikona to za mało, żeby szybko trafić.

import { habitIcon } from "./habitIconMap";
import { useDailyHabits } from "@/hooks/db/useDailyHabits";
import { useSettings } from "@/hooks/db/useSettings";
import { isHabitDone, resolveHabits } from "@/lib/habits";

interface HabitIconsProps {
  date?: string;
}

export default function HabitIcons({ date }: Readonly<HabitIconsProps>) {
  const { habits, loading: habitsLoading, toggleHabit } = useDailyHabits(date);
  const { settings } = useSettings();
  if (!habits || !settings) return null;

  const list = resolveHabits(settings);
  if (list.length === 0) return null;
  const doneCount = list.filter((h) => isHabitDone(habits, h.id)).length;

  return (
    <section aria-label={`Nawyki: ${doneCount} z ${list.length}`} className="mb-2 sm:mb-4">
      <ul className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
        {list.map((habit) => {
          const Icon = habitIcon(habit.icon);
          const done = isHabitDone(habits, habit.id);
          return (
            <li key={habit.id} className="sm:min-w-24">
              <button
                type="button"
                aria-pressed={done}
                disabled={habitsLoading}
                onClick={() => void toggleHabit(habit.id)}
                className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  done
                    ? "border-green-700/40 bg-green-50 text-green-800 dark:border-green-400/40 dark:bg-green-900/30 dark:text-green-200"
                    : "border-line bg-card text-text-secondary hover:border-line-strong hover:text-text"
                }`}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                <span className="line-clamp-2 text-center text-xs font-medium leading-tight">{habit.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
