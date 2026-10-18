// components/dashboard/DayHeader.tsx

import { Calendar, ChevronLeft, ChevronRight, ListTodo } from "lucide-react";
import { AddSpecificButton } from "../ui/CommonButtons";
import { DashboardWidgets } from "../widgets/DashboardWidgets";
import { useMemo } from "react";
import { getPolishHolidays } from "@/lib/holidays";
import { Settings } from "@/types/settings";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useResponsive } from "@/hooks/useResponsive";

interface DayHeaderProps {
  date: Date;
  dateStr: string;
  onPrev(): void;
  onNext(): void;
  handleAddDraft: (type: "task" | "event") => void;
  settings: Settings;
  loadingSettings: boolean;
}

export default function DayHeader({
  date,
  dateStr,
  onPrev,
  onNext,
  handleAddDraft,
  settings,
  loadingSettings,
}: Readonly<DayHeaderProps>) {
  const holiday = useMemo(() => {
    const map = getPolishHolidays(date.getFullYear());
    return map[dateStr] ?? null;
  }, [dateStr, date]);

  const isSmallScreen = useResponsive(721);

  return (
    <>
      <div className="relative flex items-center justify-between gap-2">
        <div className="card flex w-full items-center rounded-card p-1 hover:shadow-sm">
          <button
            onClick={onPrev}
            type="button"
            className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
            title="Poprzedni dzień"
            aria-label="Poprzedni dzień"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <div className="flex flex-1 flex-col items-center">
            <h1 className="page-title text-center text-lg first-letter:uppercase sm:text-2xl" aria-live="polite">
              {format(date, "eeee, d\u00A0MMM", { locale: pl })}
            </h1>
            {holiday && <span className="mt-1 text-xs font-medium text-danger">{holiday}</span>}
          </div>

          <button
            onClick={onNext}
            type="button"
            className="rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
            title="Następny dzień"
            aria-label="Następny dzień"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="flex max-w-25 items-center justify-between gap-2 md:min-w-50">
          <AddSpecificButton
            Icon={ListTodo}
            title={"Dodaj zadanie"}
            label={"Zadanie"}
            action={() => handleAddDraft("task")}
            small={isSmallScreen}
          />
          <AddSpecificButton
            Icon={Calendar}
            title={"Dodaj wydarzenie"}
            label={"Wydarzenie"}
            action={() => handleAddDraft("event")}
            small={isSmallScreen}
          />
        </div>
      </div>

      <DashboardWidgets settings={settings} loading={loadingSettings} date={dateStr} />
    </>
  );
}
