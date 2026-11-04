// components/health/HealthDateNav.tsx
//
// Wybór dnia (poprzedni / następny) – ten sam układ co przełącznik miesiąca w budżecie.

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { addDaysToDate } from "@/lib/health/time";

interface Props {
  date: string;
  /** Dzień bieżący – dalej niż dziś nie można przejść. */
  today: string;
  onChange: (date: string) => void;
}

const NAV_BUTTON =
  "rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-40 sm:p-2.5";

export default function HealthDateNav({ date, today, onChange }: Readonly<Props>) {
  return (
    <div className="card flex w-full items-center p-1 hover:shadow-sm">
      <button
        onClick={() => onChange(addDaysToDate(date, -1))}
        type="button"
        className={NAV_BUTTON}
        title="Poprzedni dzień"
        aria-label="Poprzedni dzień"
      >
        <ChevronLeft aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <div className="flex flex-1 flex-col items-center">
        <h2 className="page-title text-center first-letter:uppercase" aria-live="polite">
          {format(date, "eeee, d\u00A0MMM", { locale: pl })}
        </h2>
      </div>

      <button
        onClick={() => onChange(addDaysToDate(date, 1))}
        type="button"
        className={NAV_BUTTON}
        disabled={date >= today}
        title="Następny dzień"
        aria-label="Następny dzień"
      >
        <ChevronRight aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
    </div>
  );
}
