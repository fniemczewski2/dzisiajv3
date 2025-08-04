import React from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentDate: Date;
  onPrev(): void;
  onNext(): void;
}
export function CalendarHeader({ currentDate, onPrev, onNext }: Props) {
  return (
    <div className={clsx("flex items-center px-4 pb-2 my-4 justify-center")}>
      <div className="flex items-center">
        <button
          onClick={onPrev}
          className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          title="poprzedni"
        >
          <ChevronLeft className="w-4 h-4"/>
        </button>
        <h2 className="text-lg font-semibold mx-4">
          {format(currentDate, "LLLL yyyy", { locale: pl })}
        </h2>
        <button
          onClick={onNext}
          className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          title="następny"
        >
          <ChevronRight className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}
