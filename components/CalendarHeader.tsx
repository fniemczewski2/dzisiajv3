import React from "react";
import { subMonths, addMonths, subWeeks, addWeeks, format } from "date-fns";
import { pl } from "date-fns/locale";
import clsx from "clsx";

interface Props {
  currentDate: Date;
  isMobile: boolean;
  onPrev(): void;
  onNext(): void;
  onToday(): void;
}
export function CalendarHeader({
  currentDate,
  isMobile,
  onPrev,
  onNext,
  onToday,
}: Props) {
  return (
    <div
      className={clsx(
        "flex items-center px-4 pb-2",
        isMobile ? "justify-center" : "justify-between"
      )}
    >
      <div className="flex items-center">
        <button
          onClick={onPrev}
          className="w-9 h-9 bg-primary text-white rounded-xl"
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold mx-4">
          {format(currentDate, "LLLL yyyy", { locale: pl })}
        </h2>
        <button
          onClick={onNext}
          className="w-9 h-9 bg-primary text-white rounded-xl"
        >
          ›
        </button>
      </div>
      {!isMobile && (
        <button
          onClick={onToday}
          className="px-4 py-2 bg-primary text-white rounded-xl"
        >
          Dziś
        </button>
      )}
    </div>
  );
}
