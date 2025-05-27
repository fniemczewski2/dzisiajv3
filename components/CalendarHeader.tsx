import React from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentDate: Date;
  onPrev(): void;
  onNext(): void;
  onToday(): void;
}
export function CalendarHeader({ currentDate, onPrev, onNext }: Props) {
  return (
    <div className={clsx("flex items-center px-4 pb-2 my-4 justify-center")}>
      <div className="flex items-center">
        <button
          onClick={onPrev}
          className="w-9 h-9 bg-primary hover:bg-secondary flex items-center justify-center text-white rounded-lg"
          title="poprzedni"
        >
          <ChevronLeft />
        </button>
        <h2 className="text-lg font-semibold mx-4">
          {format(currentDate, "LLLL yyyy", { locale: pl })}
        </h2>
        <button
          onClick={onNext}
          className="w-9 h-9 bg-primary hover:bg-secondary flex items-center justify-center text-white rounded-lg"
          title="następny"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
