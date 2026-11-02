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
  const label = format(new Date(`${date}T12:00:00`), "eeee, d MMMM yyyy", { locale: pl });
  return (
    <nav className="card flex items-center p-1 shadow-sm" aria-label="Wybór dnia">
      <button
        type="button"
        onClick={() => onChange(addDaysToDate(date, -1))}
        className={NAV_BUTTON}
        title="Poprzedni dzień"
        aria-label="Poprzedni dzień"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </button>
      <h2 className="period-title first-letter:uppercase">{label}</h2>
      <button
        type="button"
        onClick={() => onChange(addDaysToDate(date, 1))}
        disabled={date >= today}
        className={NAV_BUTTON}
        title="Następny dzień"
        aria-label="Następny dzień"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </button>
    </nav>
  );
}
