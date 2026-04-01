"use client";

import { Droplet } from "lucide-react";
import { useDailyHabits } from "../../hooks/useDailyHabits";
import { useEffect, useState } from "react";

interface WaterTrackerProps {
  date?: string;
}

export default function WaterTracker({ date }: Readonly<WaterTrackerProps>) {
  const { habits, loading, updateWater } = useDailyHabits(date);
  const [localWater, setLocalWater] = useState<number | null>(null);

  useEffect(() => {
    if (habits && localWater === null) {
      setLocalWater(habits.water_amount ?? 0);
    }
  }, [habits, localWater]);
  if (!habits) return null;


  const displayWater = localWater !== null ? localWater : (habits.water_amount ?? 0);
  const fillPercent = (displayWater / 2) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalWater(Number.parseFloat(e.target.value));
  };

  const handleSliderRelease = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const finalWater = Number.parseFloat(e.currentTarget.value);
    
    if (habits && finalWater !== habits.water_amount) {
      updateWater(Number(finalWater.toFixed(1)));
    }
  };

  return (
    <div className="widget flex items-center justify-between px-4 py-3">
      <div className="text-primary mr-3">
        <Droplet className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      
      <div className="relative flex-1 mx-4 h-3 bg-surface rounded-full border border-gray-100 dark:border-gray-700/50 shadow-inner">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-secondary transition-all duration-75 ease-linear"
          style={{ width: `${Math.min(100, fillPercent)}%` }}
        />
        <div
          className="absolute top-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-4 border-primary transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-linear shadow pointer-events-none"
          style={{ left: `${Math.min(100, fillPercent)}%` }}
        />
        <input
          title="Poziom nawodnienia"
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={displayWater}
          disabled={loading && localWater === null}
          onChange={handleSliderChange}
          onPointerUp={handleSliderRelease} 
          onKeyUp={handleSliderRelease} // ZMIANA: Dodano zapis po puszczeniu klawisza (np. strzałki)
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
        />
      </div>
      
      <div className="font-bold text-textSecondary w-[65px] text-right text-sm sm:text-base tabular-nums">
        {displayWater.toFixed(1)} <span className="text-xs sm:text-sm font-medium text-textSubtle">/ 2.0L</span>
      </div>
    </div>
  );
}