import React from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { CalendarCell } from "./CalendarCell";
import { DAY_NAMES } from "../utils/constants";

interface Props {
  days: Date[];
  isMobile: boolean;
  tasksCount: Record<string, number>;
  habitCounts: Record<string, number>;
  waterCounts: Record<string, number>;
  onDateClick(dateStr: string): void;
}
export function CalendarGrid({
  days,
  isMobile,
  tasksCount,
  habitCounts,
  waterCounts,
  onDateClick,
}: Props) {
  const weeks: Date[][] = isMobile ? [days] : [];
  if (!isMobile)
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <>
      {!isMobile && (
        <div className="grid grid-cols-7 text-center font-medium">
          {DAY_NAMES.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
      )}
      <div
        className={clsx(
          isMobile ? "grid grid-cols-1" : "grid grid-cols-7",
          "gap-2 p-2"
        )}
      >
        {weeks.flat().map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <CalendarCell
              key={dateStr}
              day={day}
              isMobile={isMobile}
              tCount={tasksCount[dateStr] || 0}
              hCount={habitCounts[dateStr] || 0}
              wCount={waterCounts[dateStr] || 0}
              onClick={() => onDateClick(dateStr)}
            />
          );
        })}
      </div>
    </>
  );
}
