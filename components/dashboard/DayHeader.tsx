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

export default function DayHeader({ date, dateStr, onPrev, onNext, handleAddDraft, settings, loadingSettings }: Readonly<DayHeaderProps>) {

  const holiday = useMemo(() => {
      const map = getPolishHolidays(date.getFullYear());
      return map[dateStr] ?? null;
  }, [dateStr, date]);

  const isSmallScreen = useResponsive(721);

  return (
    <>
      <div className="flex items-center justify-between gap-2 relative">

        <div className="flex items-center card rounded-card p-1 w-full hover:shadow-sm">
          <button
            onClick={onPrev}
            type='button'
            className="p-2 sm:p-2.5 bg-transparent hover:bg-surface rounded-xl text-text-secondary hover:text-text transition-colors"
            title="Poprzedni dzień"
            aria-label="Poprzedni dzień"
            >
            <ChevronLeft aria-hidden="true" className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        
          <div className="flex flex-col items-center flex-1">
            <h1 className="page-title text-xl sm:text-2xl text-center first-letter:uppercase" aria-live="polite">
              {format(date, "eeee, d\u00A0MMM", { locale: pl })}
            </h1>
            {holiday && <span className="text-red-700 dark:text-red-300 text-xs font-medium mt-1">{holiday}</span>}
          </div>
        
          <button
            onClick={onNext}
            type='button'
            className="p-2 sm:p-2.5 bg-transparent hover:bg-surface rounded-xl text-text-secondary hover:text-text transition-colors"
            title="Następny dzień"
            aria-label="Następny dzień"
          >
            <ChevronRight aria-hidden="true" className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
         </div>


          <div className="flex items-center gap-2 justify-between max-w-25 md:min-w-50">
            <AddSpecificButton Icon={ListTodo} title={"Dodaj zadanie"} label={"Zadanie"} action={() => handleAddDraft('task')} small={isSmallScreen}/>
            <AddSpecificButton Icon={Calendar} title={"Dodaj wydarzenie"} label={"Wydarzenie"} action={() => handleAddDraft('event')} small={isSmallScreen}/>
          </div>
        </div>

        <DashboardWidgets settings={settings} loading={loadingSettings} date={dateStr}/>
    </>
  );
}
