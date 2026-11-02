// components/widgets/DailyStepsWidget.tsx
import React, { useId } from "react";
import { Footprints } from "lucide-react";
import { getAppDate } from "@/lib/dateUtils";
import { useHealthDays } from "@/hooks/db/useHealthData";
import { formatSteps } from "@/lib/health/format";
import { useSettings } from "@/hooks/db/useSettings";

export default function DailyStepsWidget({ date }: Readonly<{ date?: string }>) {
  const id = useId();
  const day = date ?? getAppDate();
  const { data } = useHealthDays(day, day);
  const { settings } = useSettings();

  const steps = data?.[0]?.steps;
  if (steps === undefined || steps === null) return null;

  const goal = settings.daily_steps_goal || 10000;

  const percentage = goal > 0 ? Math.min(100, Math.max(0, (steps / goal) * 100)) : 0;

  const isGoalReached = steps >= goal;
  const barColor = isGoalReached ? "bg-warning" : "bg-[var(--theme-fill)]";

  return (
    <section aria-labelledby={`${id}-h`} className="widget relative w-full overflow-hidden px-4 py-3">
      <h2 id={`${id}-h`} className="sr-only">
        Kroki
      </h2>
      <div className="flex items-center justify-between gap-3">
        <Footprints className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        <div className="text-right text-sm font-bold text-text-secondary tabular-nums sm:text-base">
          {formatSteps(steps)}
        </div>
      </div>

      {goal > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      )}
    </section>
  );
}
