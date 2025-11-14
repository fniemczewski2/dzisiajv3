// components/tasks/WaterTracker.tsx
"use client";

import { Droplet, Loader2 } from "lucide-react";
import { useDailyHabits } from "../../hooks/useDailyHabits";

interface WaterTrackerProps {
  date?: string;
}

export default function WaterTracker({ date }: WaterTrackerProps) {
  const { habits, loading, updateWater } = useDailyHabits(date);

  if (!habits) {
    return (
      <div className="bg-card rounded-xl flex items-center justify-center px-3 py-2 sm:p-4 mb-2 h-[40px] sm:h-[56px]">
        <Loader2 className="animate-spin w-5 h-5 text-gray-500" />
      </div>
    );
  }

  const water = habits.water_amount ?? 0;
  const fillPercent = (water / 2) * 100;

  const handleChange = (val: number) => {
    updateWater(val);
  };

  return (
    <div className="bg-card rounded-xl flex flex-row shadow items-center justify-around px-3 py-2 sm:p-4 mb-2 h-[40px] sm:h-[56px]">
      <Droplet className="w-5 h-5 sm:w-6 sm:h-6" />
      <div className="relative w-[58%] sm:w-[75%] h-3 mx-2 bg-secondary/10 rounded">
        <div
          className="absolute left-0 top-0 h-3 rounded-full bg-primary transition-all duration-200"
          style={{ width: `${fillPercent}%` }}
        />
        <div
          className="absolute top-1/2 w-6 h-6 rounded-full bg-primary border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
          style={{ left: `${fillPercent}%` }}
        />
        <input
          title="water"
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={water}
          disabled={loading}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="absolute inset-0 rounded-full w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="font-medium text-gray-700 ml-2">
        {water.toFixed(1)}L / 2.0L
      </span>
    </div>
  );
}