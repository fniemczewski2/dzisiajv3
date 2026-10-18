// components/calendar/CalendarHeader.tsx

import React from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarHeaderProps {
  currentDate: Date;
  onPrev(): void;
  onNext(): void;
}

export default function CalendarHeader({ currentDate, onPrev, onNext }: Readonly<CalendarHeaderProps>) {
  return (
    <div className={clsx("my-2 flex items-center justify-center px-4 pb-4 sm:my-4 sm:pb-6")}>
      <div className="card flex items-center rounded-card p-1 shadow-sm">
        <button
          onClick={onPrev}
          className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
          type="button"
          title="Poprzedni miesiąc"
          aria-label="Poprzedni miesiąc"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <h2 className="mx-4 min-w-35 text-center text-lg font-bold tracking-wide text-text capitalize sm:mx-8 sm:min-w-40 sm:text-xl">
          {format(currentDate, "LLLL yyyy", { locale: pl })}
        </h2>

        <button
          onClick={onNext}
          className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
          type="button"
          title="Następny miesiąc"
          aria-label="Następny miesiąc"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
    </div>
  );
}
