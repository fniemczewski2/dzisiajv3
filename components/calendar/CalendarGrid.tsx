import React, { useMemo } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { CalendarCell } from "./CalendarCell";
import { DAY_NAMES } from "../../utils/constants";
import { Event } from "../../types";

interface Props {
  days: Date[];
  isMobile: boolean;
  showMonthView: boolean;
  tasksCount?: Record<string, number>;
  habitCounts?: Record<string, number>;
  waterCounts?: Record<string, number>;
  moneyCounts?: Record<string, number>;
  events?: Record<string, Event[]>;
  onDateClick(dateStr: string): void;
}

export default function CalendarGrid({
  days,
  isMobile,
  showMonthView,
  tasksCount = {},
  habitCounts = {},
  waterCounts = {},
  moneyCounts = {},
  events = {},
  onDateClick,
}: Props) {
  const weeks = useMemo(() => {
    if (isMobile) return [days];
    const chunks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [days, isMobile]);

  const showDayNames = !isMobile || showMonthView;

  const showCounts = !isMobile || showMonthView === false;

  const gridClass = clsx(
    isMobile && !showMonthView
      ? "grid grid-cols-1 my-4"
      : "grid grid-cols-7 mt-2 mb-6",
    isMobile && showMonthView ? "gap-0.5" : "gap-2 p-2"
  );

  return (
    <>
      {showDayNames && (
        <div className="grid grid-cols-7 text-center font-medium">
          {DAY_NAMES.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
      )}

      <div className={gridClass}>
        {weeks.flat().map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");

          const countProps = showCounts
            ? {
                tCount: tasksCount[dateStr] || 0,
                hCount: habitCounts[dateStr] || 0,
                wCount: waterCounts[dateStr] || 0,
                mCount: moneyCounts[dateStr] || 0,
              }
            : {};

          return (
            <CalendarCell
              key={dateStr}
              day={day}
              isMobile={isMobile}
              showMonthView={showMonthView}
              eventTitle={events[dateStr]?.[0]?.title}
              onClick={() => onDateClick(dateStr)}
              {...countProps}
            />
          );
        })}
      </div>
    </>
  );
}
