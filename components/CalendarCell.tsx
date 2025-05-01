import React from "react";
import { format, isSameMonth, isSameDay } from "date-fns";
import { ClipboardList, CheckSquare, Droplet } from "lucide-react";
import clsx from "clsx";
import { pl } from "date-fns/locale";

interface Props {
  day: Date;
  isMobile: boolean;
  tCount: number;
  hCount: number;
  wCount: number;
  onClick(): void;
}
export function CalendarCell({
  day,
  isMobile,
  tCount,
  hCount,
  wCount,
  onClick,
}: Props) {
  const today = new Date();
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-card p-2 flex flex-col justify-between border cursor-pointer rounded-md shadow hover:bg-gray-100",
        isMobile ? "h-32" : "h-24"
      )}
    >
      <span
        className={clsx(
          "inline-block w-7 h-7 text-center rounded-full",
          isSameDay(day, today)
            ? "bg-primary text-white"
            : "hover:bg-primary hover:text-white"
        )}
      >
        {format(day, "d", { locale: pl })}
      </span>
      <div className="flex justify-center space-x-2 text-xs">
        <ClipboardList size={16} />
        <span>{tCount}</span>
        <CheckSquare size={16} />
        <span>{hCount}</span>
        <Droplet size={16} />
        <span>{wCount}</span>
      </div>
    </div>
  );
}
