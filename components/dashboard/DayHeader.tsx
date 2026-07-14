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

        <div className="flex items-center card rounded-2xl p-1 w-full shadow-sm">
          <button
            onClick={onPrev}
            className="p-2 sm:p-2.5 bg-transparent hover:bg-surface rounded-xl text-textSecondary hover:text-text transition-colors"
            title="Poprzedni dzień"
            >
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        
          <div className="flex flex-col items-center flex-1">
            <h3 className="font-bold text-base sm:text-2xl text-text text-center flex items-center justify-center">
              {format(date, "d MMMM", { locale: pl })}
            </h3>
            {holiday && <span className="text-red-600 dark:text-red-400 text-[8px] font-medium uppercase tracking-wider mt-1">{holiday}</span>}
          </div>
        
          <button
            onClick={onNext}
            className="p-2 sm:p-2.5 bg-transparent hover:bg-surface rounded-xl text-textSecondary hover:text-text transition-colors"
            title="Następny miesiąc"
          >
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
         </div>


          <div className="flex items-center gap-2">
            <AddSpecificButton Icon={ListTodo} title={"Dodaj zadanie"} label={"zadanie"} action={() => handleAddDraft('task')} small={isSmallScreen}/>
            <AddSpecificButton Icon={Calendar} title={"Dodaj wydarzenie"} label={"wydarzenie"} action={() => handleAddDraft('event')} small={isSmallScreen}/>
          </div>
        </div>

        <DashboardWidgets settings={settings} loading={loadingSettings} date={dateStr}/>
    </>
  );
}