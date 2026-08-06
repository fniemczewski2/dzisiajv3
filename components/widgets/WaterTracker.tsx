// components/widgets/WaterTracker.tsx

import { Droplet } from "lucide-react";
import { useDailyHabits } from "@/hooks/db/useDailyHabits";
import { useState } from "react";

interface WaterTrackerProps {
  date?: string;
}

export default function WaterTracker({ date }: Readonly<WaterTrackerProps>) {
  const { habits, fetching, updateWater } = useDailyHabits(date);

  // Stan lokalny żyje TYLKO podczas przeciągania suwaka. Wcześniej trzymał
  // wartość na stałe i nie był czyszczony przy zmianie daty, więc widget
  // pokazywał ilość wody z poprzednio oglądanego dnia.
  const [draft, setDraft] = useState<number | null>(null);

  // Reset przy zmianie dnia liczony w trakcie renderu (zalecany sposób na
  // "state zależny od propsa"), a nie w useEffect - dzięki temu nie ma renderu,
  // w którym widać jeszcze wartość z poprzedniej daty.
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

    // Hook aktualizuje `habits` optymistycznie, więc po wyczyszczeniu draftu
    // widget od razu pokazuje nową wartość - bez mrugnięcia na starą.
    if (finalWater !== savedWater) {
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
          disabled={fetching}
          onChange={handleSliderChange}
          onPointerUp={handleSliderRelease} 
          onKeyUp={handleSliderRelease}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
        />
      </div>
      
      <div className="font-bold text-textSecondary w-17.5 text-right text-sm sm:text-base tabular-nums">
        {displayWater.toFixed(1)} <span className="text-xs sm:text-sm font-medium text-textSubtle">/ 2.0L</span>
      </div>
    </div>
  );
}