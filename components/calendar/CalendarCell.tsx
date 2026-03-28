// components/calendar/CalendarCell.tsx
import clsx from "clsx";
import { isSameDay, parseISO } from "date-fns";
import { Calendar, ListTodo } from "lucide-react";
import React, { memo, useMemo } from "react";
import { getAppDate } from "../../lib/dateUtils";
import { useSettings } from "../../hooks/useSettings";
import { MoodEntry, MoodOption } from "../../types";

interface Props {
  date: Date;
  currentMonth: number;
  tCount?: number | null;
  eCount?: number | null;
  isMobile: boolean;
  onClick: () => void;
  dayMood?: MoodEntry | null;
  DEFAULT_MOODS: MoodOption[];
  holiday?: string;
}

function areEqual(prev: Props, next: Props): boolean {
  return (
    prev.date.getTime() === next.date.getTime() &&
    prev.currentMonth === next.currentMonth &&
    prev.tCount === next.tCount &&
    prev.eCount === next.eCount &&
    prev.isMobile === next.isMobile &&
    prev.onClick === next.onClick &&
    prev.dayMood?.mood_id === next.dayMood?.mood_id &&
    prev.holiday === next.holiday
  );
}

const CalendarCell = memo(function CalendarCell({
  date,
  currentMonth,
  tCount,
  eCount,
  isMobile,
  onClick,
  dayMood,
  DEFAULT_MOODS,
  holiday,
}: Readonly<Props>) {
  const today = parseISO(getAppDate());
  const isOutside = date.getMonth() !== currentMonth;
  const isToday = isSameDay(date, today);
  const { settings } = useSettings();

  const moodOption = useMemo(() => {
    if (!dayMood) return null;
    return (
      settings?.mood_options?.find(
        (o: MoodOption) => o.id === dayMood.mood_id
      ) ?? DEFAULT_MOODS.find((o) => o.id === dayMood.mood_id)
    );
  }, [dayMood, settings?.mood_options, DEFAULT_MOODS]);

  return (
    <button
      type="button"
      className={clsx(
        "flex flex-col relative text-left justify-between p-1 sm:p-2 sm:min-h-[106px] min-h-[86px] rounded-xl cursor-pointer overflow-hidden border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isOutside
          ? "bg-transparent border-transparent text-textMuted opacity-50 hover:bg-surface"
          : "card shadow-sm hover:shadow-md",
        isToday && "ring-1 ring-primary"
      )}
      onClick={onClick}
      aria-label={`Wybierz datę ${date.toLocaleDateString()}`}
    >
      <div className="flex flex-nowrap justify-between items-center w-full">
        <div
          className={clsx(
            "text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-colors",
            isToday ? "bg-primary text-white" : "text-text",
            isOutside && !isToday && "text-textMuted",
            holiday &&
              (isToday
                ? "bg-red-600 dark:bg-red-400/80" 
                : "text-red-600 dark:text-red-400")
          )}
        >
          {date.getDate()}
        </div>

        {moodOption && isMobile && (
          <div
            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full absolute top-1 right-1 shadow-sm"
            style={{ backgroundColor: moodOption.color }}
            title={moodOption.label}
          />
        )}

        <div className="flex items-center gap-1 z-10">
          {tCount && !isMobile && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-surface rounded-md text-[10px] font-bold text-textSecondary">
              <ListTodo size={12} />
              {tCount}
            </div>
          )}
          {(eCount != 0 && !isMobile) && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-surface rounded-md text-[10px] font-bold text-textSecondary">
              <Calendar size={12} />
              +{eCount}
            </div>
          )}
          {!isMobile && (
            <div
              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shadow-sm"
              style={{ backgroundColor: moodOption?.color }}
              title={moodOption?.label}
            />
          )}
        </div>
      </div>
    </button>
  );
},
areEqual);

export default CalendarCell;