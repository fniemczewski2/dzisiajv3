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
        "bg-card flex flex-col justify-between shadow hover:bg-gray-100 p-1 sm:min-h-[106px] min-h-[86px] rounded-md m-0.25 cursor-pointer overflow-hidden",
        isOutside ? "bg-gray-50 text-gray-400" : "bg-white"
      )}
      onClick={onClick}
    >
      <div className="flex flex-nowrap justify-between items-center">
        <div
          className={clsx(
            "text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full",
            isToday && "bg-primary text-white"
          )}
        >
          {date.getDate()}
        </div>

        {tCount && !isMobile && (
          <div className="flex items-center gap-1 px-1 text-xs text-gray-600">
            <ListTodo size={14} />
            {tCount}
          </div>
        )}
        {eCount && (
          <div className="flex items-center gap-1 px-1 text-xs text-gray-600">
            +{eCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarCell;