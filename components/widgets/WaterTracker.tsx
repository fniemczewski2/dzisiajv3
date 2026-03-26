"use client";

import { Droplet } from "lucide-react";
import { useDailyHabits } from "../../hooks/useDailyHabits";
import LoadingState from "../LoadingState";

interface WaterTrackerProps {
  date?: string;
}

export default function WaterTracker({ date }: WaterTrackerProps) {
  const { habits, loading, updateWater } = useDailyHabits(date);

  if (!habits || loading) return null;

  const water = habits.water_amount ?? 0;
  const fillPercent = (water / 2) * 100;

  return (
    <div className="widget flex items-center justify-between px-4 py-3">
      <div className="text-primary mr-3">
        <Droplet className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      
      <div className="relative flex-1 mx-4 h-3 bg-surface rounded-full border border-gray-100 dark:border-gray-700/50 shadow-inner">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, fillPercent)}%` }}
        />
        <div
          className="absolute top-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-4 border-primary transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out shadow"
          style={{ left: `${Math.min(100, fillPercent)}%` }}
        />
        <input
          title="Poziom nawodnienia"
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={water}
          disabled={loading}
          onChange={(e) => updateWater(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>
      
      <div className="font-bold text-textSecondary w-[65px] text-right text-sm sm:text-base tabular-nums">
        {water.toFixed(1)} <span className="text-xs sm:text-sm font-medium text-textSubtle">/ 2.0L</span>
      </div>
    </div>
  );
}