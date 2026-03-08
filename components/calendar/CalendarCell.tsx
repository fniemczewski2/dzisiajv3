import clsx from "clsx";
import { isSameDay, parseISO } from "date-fns";
import { ListTodo } from "lucide-react";
import React from "react";
import { getAppDate } from "../../lib/dateUtils";

interface Props {
  date: Date;
  currentMonth: number;
  tCount?: number | null;
  eCount?: number | null;
  isMobile: boolean;
  onClick: () => void;
}

const CalendarCell: React.FC<Props> = ({
  date,
  currentMonth,
  tCount,
  eCount,
  isMobile,
  onClick,
}) => {
  const today = parseISO(getAppDate());
  const isOutside = date.getMonth() !== currentMonth;
  const isToday = isSameDay(date, today);

  return (
    <div
      className={clsx(
        "flex flex-col justify-between p-1 sm:p-2 sm:min-h-[106px] min-h-[86px] rounded-xl cursor-pointer overflow-hidden border transition-all duration-200",
        isOutside 
          ? "bg-transparent border-transparent text-textMuted opacity-50 hover:bg-surface" 
          : "bg-card border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary/50",
        isToday && "ring-2 ring-primary ring-offset-2 dark:ring-offset-card"
      )}
      onClick={onClick}
    >
      <div className="flex flex-nowrap justify-between items-center w-full">
        <div
          className={clsx(
            "text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-colors",
            isToday ? "bg-primary text-white" : "text-text",
            isOutside && !isToday && "text-textMuted"
          )}
        >
          {date.getDate()}
        </div>

        <div className="flex gap-1">
          {tCount && !isMobile && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-surface rounded-md text-[10px] font-bold text-textSecondary">
              <ListTodo size={12} />
              {tCount}
            </div>
          )}
          {eCount && (
            <div className="flex items-center justify-center px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">
              +{eCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarCell;