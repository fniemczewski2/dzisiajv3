// components/widgets/WaterTracker.tsx

import { Droplet } from "lucide-react";
import { useDailyHabits } from "@/hooks/db/useDailyHabits";
import { useState } from "react";

interface WaterTrackerProps {
  date?: string;
}

export default function WaterTracker({ date }: Readonly<WaterTrackerProps>) {
  const { habits, fetching, updateWater } = useDailyHabits(date);

  const [draft, setDraft] = useState<number | null>(null);
  const [renderedDate, setRenderedDate] = useState(date);
  if (date !== renderedDate) {
    setRenderedDate(date);
    setDraft(null);
  }

  if (!habits) return null;

  const savedWater = habits.water_amount ?? 0;
  const displayWater = (date === renderedDate ? draft : null) ?? savedWater;
  const fillPercent = (displayWater / 2) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(Number.parseFloat(e.target.value));
  };

  const handleSliderRelease = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const finalWater = Number.parseFloat(e.currentTarget.value);
    setDraft(null);

    if (finalWater !== savedWater) {
      void updateWater(Number(finalWater.toFixed(1)));
    }
  };

  return (
    <div className="widget flex items-center justify-between px-4 py-3">
      <div className="mr-3 text-primary">
        <Droplet className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>

      <div className="relative mx-4 h-3 flex-1 rounded-full border border-line bg-surface shadow-inner">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-secondary transition-all duration-75 ease-linear"
          style={{ width: `${Math.min(100, fillPercent)}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-4 border-primary bg-white shadow transition-all duration-75 ease-linear sm:h-6 sm:w-6"
          style={{ left: `${Math.min(100, fillPercent)}%` }}
        />
        <input
          title="Poziom nawodnienia"
          aria-label="Poziom nawodnienia"
          aria-valuetext={`${displayWater} l z 2 l`}
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={displayWater}
          disabled={fetching}
          onChange={handleSliderChange}
          onPointerUp={handleSliderRelease}
          onKeyUp={handleSliderRelease}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer touch-none opacity-0"
        />
      </div>

      <div className="w-17.5 text-right text-sm font-bold text-text-secondary tabular-nums sm:text-base">
        {displayWater.toFixed(1)} <span className="text-textSubtle text-xs font-medium sm:text-sm">/ 2.0L</span>
      </div>
    </div>
  );
}
