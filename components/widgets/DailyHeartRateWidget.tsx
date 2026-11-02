// components/widgets/DailyHeartRateWidget.tsx
import React, { useId } from "react";
import { Heart } from "lucide-react";
import { getAppDate } from "@/lib/dateUtils";
import { useHealthDays } from "@/hooks/db/useHealthData";
import { HEART_RATE_LIMITS } from "@/config/constants";

interface DailyHeartRateWidgetProps {
  date?: string;
}

export default function DailyHeartRateWidget({ date }: Readonly<DailyHeartRateWidgetProps>) {
  const id = useId();
  const day = date ?? getAppDate();
  const { data } = useHealthDays(day, day);

  const heartRate = data?.[0]?.heart_rate_resting;

  if (heartRate === undefined || heartRate === null) return null;

  const [minLimit, maxLimit] = HEART_RATE_LIMITS;
  const range = maxLimit - minLimit;
  const percentage = Math.min(100, Math.max(0, ((heartRate - minLimit) / range) * 100));
  const isHeartRateNormal = heartRate >= minLimit && heartRate <= maxLimit;
  const barColor = isHeartRateNormal ? "bg-[var(--theme-fill)]" : "bg-warning";

  return (
    <section aria-labelledby={`${id}-h`} className="widget relative w-full overflow-hidden px-4 py-3">
      <h2 id={`${id}-h`} className="sr-only">
        Tętno
      </h2>
      <div className="flex items-center justify-between gap-3">
        <Heart className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        <div className="text-right text-sm font-bold text-text-secondary tabular-nums sm:text-base">
          {heartRate}&nbsp;bpm
        </div>
      </div>

      {/* Pasek postępu */}
      <div
        className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ease-out ${barColor}`}
        style={{ width: `${percentage}%` }}
        aria-hidden="true"
      />
    </section>
  );
}
