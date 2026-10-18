// components/calendar/CalendarCell.tsx

import clsx from "clsx";
import { isSameDay, parseISO } from "date-fns";
import { AlertTriangle, Calendar, Repeat } from "lucide-react";
import React, { memo, useMemo } from "react";
import { getAppDate } from "@/lib/dateUtils";
import { MoodEntry, MoodOption } from "@/types/moods";

interface Props {
  date: Date;
  currentMonth: number;
  eCount?: number | null;
  isMobile: boolean;
  onClick: () => void;
  dayMood?: MoodEntry | null;
  moodOptions: MoodOption[];
  holiday?: string;
  eventTotal?: number;
  hasConflict?: boolean;
  /** Tytuły zadań cyklicznych, które wypadną tego dnia (podgląd). */
  repeatTitles?: readonly string[];
}

const dayLabelFmt = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" });

function eventsLabel(n: number): string {
  if (n === 0) return "brak wydarzeń";
  if (n === 1) return "1 wydarzenie";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} wydarzenia`;
  return `${n} wydarzeń`;
}

function areEqual(prev: Props, next: Props): boolean {
  return (
    prev.date.getTime() === next.date.getTime() &&
    prev.currentMonth === next.currentMonth &&
    prev.eCount === next.eCount &&
    prev.isMobile === next.isMobile &&
    prev.onClick === next.onClick &&
    prev.dayMood?.mood_id === next.dayMood?.mood_id &&
    prev.moodOptions === next.moodOptions &&
    prev.holiday === next.holiday &&
    prev.eventTotal === next.eventTotal &&
    prev.hasConflict === next.hasConflict &&
    (prev.repeatTitles ?? []).join("|") === (next.repeatTitles ?? []).join("|")
  );
}

const CalendarCell = memo(function CalendarCell({
  date,
  currentMonth,
  eCount,
  isMobile,
  onClick,
  dayMood,
  moodOptions,
  holiday,
  eventTotal = 0,
  hasConflict = false,
  repeatTitles = [],
}: Readonly<Props>) {
  const repeatCount = repeatTitles.length;
  const today = parseISO(getAppDate());
  const isOutside = date.getMonth() !== currentMonth;
  const isToday = isSameDay(date, today);

  const moodOption = useMemo(() => {
    if (!dayMood) return null;
    return moodOptions.find((o) => o.id === dayMood.mood_id) ?? null;
  }, [dayMood, moodOptions]);

  return (
    <button
      type="button"
      className={clsx(
        "relative flex min-h-21.5 cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-1 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-26.5 sm:p-2",
        isOutside
          ? "border-transparent bg-transparent text-text-muted opacity-50 hover:bg-surface"
          : "card hover:border-line-strong",
        isToday && "ring-1 ring-primary"
      )}
      onClick={onClick}
      aria-label={[
        dayLabelFmt.format(date),
        isToday ? "dziś" : null,
        holiday ? `święto: ${holiday}` : null,
        eventsLabel(eventTotal),
        hasConflict ? "uwaga: nakładające się terminy" : null,
        repeatCount > 0 ? `powtórzenia zadań: ${repeatTitles.join(", ")}` : null,
        moodOption ? `nastrój: ${moodOption.label}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      aria-current={isToday ? "date" : undefined}
    >
      <div className="flex w-full flex-nowrap items-center justify-between">
        <div
          className={clsx(
            "flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold transition-colors sm:h-7 sm:w-7",
            isToday ? "bg-secondary text-white" : "text-text",
            isOutside && !isToday && "text-text-muted",
            holiday && (isToday ? "bg-danger-solid" : "text-danger")
          )}
        >
          {date.getDate()}
        </div>

        {moodOption && isMobile && (
          <div
            aria-hidden="true"
            className="absolute top-1 right-1 h-2 w-2 rounded-full sm:h-3 sm:w-3"
            style={{ backgroundColor: moodOption.color }}
            title={moodOption.label}
          />
        )}

        <div className="z-10 flex items-center gap-1">
          {repeatCount > 0 && (
            <span
              aria-hidden="true"
              title={`Powtórzenia zadań: ${repeatTitles.join(", ")}`}
              className="flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border border-dashed border-line-strong px-1 text-xs font-semibold text-text-secondary"
            >
              <Repeat className="h-3 w-3" />
              {repeatCount > 1 && <span className="tabular-nums">{repeatCount}</span>}
            </span>
          )}
          {hasConflict && (
            <span
              aria-hidden="true"
              title="Nakładające się terminy"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-warning-soft text-warning"
            >
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
          {eCount != 0 && !isMobile && (
            <div className="flex items-center gap-0.5 rounded-lg bg-surface px-1.5 py-0.5 text-xs font-bold text-text-secondary">
              <Calendar size={12} aria-hidden="true" />+{eCount}
            </div>
          )}
          {!isMobile && (
            <div
              aria-hidden="true"
              className="h-2 w-2 rounded-full sm:h-3 sm:w-3"
              style={{ backgroundColor: moodOption?.color }}
              title={moodOption?.label}
            />
          )}
        </div>
      </div>
    </button>
  );
}, areEqual);

export default CalendarCell;
