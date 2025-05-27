import React from "react";
import { format, isSameDay } from "date-fns";
import { Droplet, CopyCheck, ListTodo, Coins } from "lucide-react";
import clsx from "clsx";
import { pl } from "date-fns/locale";

interface Props {
  day: Date;
  isMobile: boolean;
  tCount: number;
  hCount: number;
  wCount: number;
  mCount: number;
  eventTitle?: string;
  onClick(): void;
}

export function CalendarCell({
  day,
  isMobile,
  tCount,
  hCount,
  wCount,
  mCount,
  eventTitle,
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

      {eventTitle && (
        <div className="mt-1 text-sm text-center bg-gray-200 rounded-sm truncate">
          {eventTitle}
        </div>
      )}

      <div className="flex flex-wrap justify-center space-x-2">
        <span className="flex justify-center text-xs">
          <ListTodo size={14} />
          &nbsp;
          {tCount}
        </span>
        <span className="flex justify-center text-xs">
          <CopyCheck size={14} />
          &nbsp;
          {hCount}
        </span>
        <span className="flex justify-center text-xs">
          <Droplet size={14} />
          &nbsp;
          {wCount}
        </span>
        <span className="flex justify-center text-xs">
          <Coins size={14} />
          &nbsp;
          {mCount}
        </span>
      </div>
    </div>
  );
}
