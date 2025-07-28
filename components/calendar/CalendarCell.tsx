import React from "react";
import { format, isSameDay } from "date-fns";
import { Droplet, CopyCheck, ListTodo, Coins } from "lucide-react";
import clsx from "clsx";
import { pl } from "date-fns/locale";

interface Props {
  day: Date;
  isMobile: boolean;
  showMonthView: boolean;
  tCount?: number;
  hCount?: number;
  wCount?: number;
  mCount?: number;
  eventTitle?: string;
  onClick(): void;
}

export const CalendarCell = React.memo(function CalendarCell({
  day,
  isMobile,
  showMonthView,
  tCount = 0,
  hCount = 0,
  wCount = 0,
  mCount = 0,
  eventTitle,
  onClick,
}: Props) {
  const today = new Date();
  const showCounts = !isMobile || showMonthView === false;

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-card p-1 flex flex-col justify-between border cursor-pointer rounded-md shadow hover:bg-gray-100",
        isMobile && !showMonthView ? "h-32" : "h-24"
      )}
    >
      <span
        className={clsx(
          "inline-block w-7 h-7 text-center rounded-full",
          isSameDay(day, today)
            ? "bg-primary text-white"
            : "hover:bg-primary hover:text-white"
        )}
      >
        {format(day, "d", { locale: pl })}
      </span>

      {eventTitle && (
        <div className="mt-1 text-[11px] text-center bg-gray-200 rounded-sm truncate">
          {eventTitle}
        </div>
      )}

      {showCounts && (
        <div className="flex flex-wrap justify-center gap-x-2 text-xs mt-1">
          {tCount > 0 && (
            <span className="flex items-center">
              <ListTodo size={14} />
              &nbsp;{tCount}
            </span>
          )}
          {hCount > 0 && (
            <span className="flex items-center">
              <CopyCheck size={14} />
              &nbsp;{hCount}
            </span>
          )}
          {wCount > 0 && (
            <span className="flex items-center">
              <Droplet size={14} />
              &nbsp;{wCount}
            </span>
          )}
          {mCount > 0 && (
            <span className="flex items-center">
              <Coins size={14} />
              &nbsp;{mCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
