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

export default function CalendarHeader({ currentDate, onPrev, onNext }: Readonly<Props>) {
  return (
    <div className={clsx("flex items-center px-4 pb-4 sm:pb-6 my-2 sm:my-4 justify-center")}>
      <div className="flex items-center card rounded-2xl p-1 shadow-sm">
        <button
          onClick={onPrev}
          className="p-2 sm:p-2.5 bg-transparent hover:bg-surface rounded-xl text-textSecondary hover:text-text transition-colors"
          title="Poprzedni miesiąc"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        
        <h2 className="text-lg sm:text-xl font-bold text-text mx-4 sm:mx-8 min-w-[140px] sm:min-w-[160px] text-center capitalize tracking-wide">
          {format(currentDate, "LLLL yyyy", { locale: pl })}
        </h2>
        
        <button
          onClick={onNext}
          className="p-2 sm:p-2.5 bg-transparent hover:bg-surface rounded-xl text-textSecondary hover:text-text transition-colors"
          title="Następny miesiąc"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
}