// components/calendar/MonthView.tsx

import React, { useMemo, memo } from "react";
import { Event, PlacedEvent } from "@/types/events";
import { MoodEntry, MoodOption } from "@/types/moods";
import {
  startOfMonth,
  endOfMonth,
  addDays,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  max,
  min,
  differenceInCalendarDays,
  format,
  endOfDay,
} from "date-fns";
import CalendarCell from "./CalendarCell";
import { useResponsive } from "@/hooks/useResponsive";
import { getPolishHolidays } from "@/lib/holidays";
import { parseEventDate } from "@/lib/dateUtils";
import { getEventsForDay } from "@/lib/eventUtils";
import { overlappingEventIds } from "@/lib/eventConflicts";
import { useCategoryColors } from "@/hooks/useTaskCategories";
import { useRecurringTaskPreviews } from "@/hooks/db/useRecurringTaskPreviews";
import { groupPreviewsByDate } from "@/lib/taskOccurrences";
import { DEFAULT_EVENT_COLOR } from "@/config/defaults";

interface MonthViewProps {
  events: Event[];
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  moods: MoodEntry[];
  moodOptions: MoodOption[];
}

const weekdayNamesPL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

const getSortedEventsForWeek = (events: Event[], weekStart: Date, weekEnd: Date) => {
  const eventsThisWeek = events.filter((event) => {
    const start = parseEventDate(event.start_time);
    const end = parseEventDate(event.end_time);
    return !(isBefore(end, weekStart) || isAfter(start, weekEnd));
  });

  return eventsThisWeek.sort((a, b) => {
    const aStart = parseEventDate(a.start_time);
    const aEnd = parseEventDate(a.end_time);
    const bStart = parseEventDate(b.start_time);
    const bEnd = parseEventDate(b.end_time);
    const aSpan = differenceInCalendarDays(min([aEnd, weekEnd]), max([aStart, weekStart])) + 1;
    const bSpan = differenceInCalendarDays(min([bEnd, weekEnd]), max([bStart, weekStart])) + 1;
    return bSpan - aSpan;
  });
};

const tryPlaceEvent = (
  colIndex: number,
  span: number,
  colOccupancy: boolean[][],
  placeholders: PlacedEvent[],
  event: Event,
  segStart: Date,
  segEnd: Date
): boolean => {
  for (let row = 0; row < 3; row++) {
    let canPlace = true;
    for (let i = 0; i < span; i++) {
      if (colIndex + i > 6 || colOccupancy[colIndex + i][row]) {
        canPlace = false;
        break;
      }
    }
    if (canPlace) {
      for (let i = 0; i < span; i++) {
        if (colIndex + i <= 6) colOccupancy[colIndex + i][row] = true;
      }
      placeholders.push({ event, start: segStart, end: segEnd, col: colIndex, span, row });
      return true;
    }
  }
  return false;
};

const processWeekLayout = (week: Date[], events: Event[]) => {
  const weekStart = week[0];
  const weekEnd = endOfDay(week[6]);

  const sortedEvents = getSortedEventsForWeek(events, weekStart, weekEnd);

  const colOccupancy: boolean[][] = Array.from({ length: 7 }, () => Array.from({ length: 3 }, () => false));
  const limitedEvents: PlacedEvent[] = [];
  const overflowCounts: number[] = Array.from({ length: 7 }, () => 0);

  for (const event of sortedEvents) {
    const start = parseEventDate(event.start_time);
    const end = parseEventDate(event.end_time);
    const segStart = max([start, weekStart]);
    const segEnd = min([end, weekEnd]);
    const colIndex = differenceInCalendarDays(segStart, weekStart);
    const span = differenceInCalendarDays(segEnd, segStart) + 1;

    const placed = tryPlaceEvent(colIndex, span, colOccupancy, limitedEvents, event, segStart, segEnd);

    if (!placed) {
      for (let i = 0; i < span; i++) {
        if (colIndex + i <= 6) overflowCounts[colIndex + i]++;
      }
    }
  }

  return { week, limitedEvents, overflowCounts };
};

const MonthView = memo(function MonthView({
  events,
  currentDate,
  onSelectDate,
  moods,
  moodOptions,
}: Readonly<MonthViewProps>) {
  const isMobile = useResponsive();
  const categoryColors = useCategoryColors();

  const { calendarStart, calendarEnd } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return {
      monthStart,
      monthEnd,
      calendarStart: calStart,
      calendarEnd: calEnd,
      rangeStart: format(calStart, "yyyy-MM-dd"),
      rangeEnd: format(calEnd, "yyyy-MM-dd"),
    };
  }, [currentDate]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let current = calendarStart;
    while (current <= calendarEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(current);
        current = addDays(current, 1);
      }
      result.push(week);
    }
    return result;
  }, [calendarStart, calendarEnd]);

  const weekData = useMemo(() => {
    return weeks.map((week) => processWeekLayout(week, events));
  }, [weeks, events]);

  // Przyszłe wystąpienia zadań cyklicznych w widocznych tygodniach (podgląd).
  const visibleFrom = weeks.length > 0 ? format(weeks[0][0], "yyyy-MM-dd") : "";
  const visibleTo = weeks.length > 0 ? format(weeks.at(-1)!.at(-1)!, "yyyy-MM-dd") : "";
  const taskPreviews = useRecurringTaskPreviews(visibleFrom, visibleTo);
  const previewsByDay = useMemo(() => groupPreviewsByDate(taskPreviews), [taskPreviews]);

  // Liczba wydarzeń i kolizje w każdym dniu – do etykiety komórki i znacznika ostrzeżenia.
  const dayInfo = useMemo(() => {
    const info: Record<string, { count: number; conflict: boolean }> = {};
    weeks.flat().forEach((day) => {
      const dayEvents = getEventsForDay(events, day);
      info[format(day, "yyyy-MM-dd")] = {
        count: dayEvents.length,
        conflict: overlappingEventIds(dayEvents).size > 0,
      };
    });
    return info;
  }, [weeks, events]);

  const moodMap = useMemo(() => {
    const map: Record<string, MoodEntry> = {};
    moods.forEach((m) => {
      map[m.date] = m;
    });
    return map;
  }, [moods]);

  const holidaysMap = useMemo(() => {
    const year = currentDate.getFullYear();
    return {
      ...getPolishHolidays(year - 1),
      ...getPolishHolidays(year),
      ...getPolishHolidays(year + 1),
    };
  }, [currentDate]);

  const clickHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {};
    weeks.flat().forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      handlers[key] = () => onSelectDate(day);
    });
    return handlers;
  }, [weeks, onSelectDate]);

  return (
    <div className="space-y-0.5 sm:space-y-2">
      <div className="grid grid-cols-7 border-b border-line pb-2 text-center text-xs font-bold text-text-muted sm:text-sm">
        {weekdayNamesPL.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {weekData.map(({ week, limitedEvents, overflowCounts }) => (
        <div key={`week-${week[0].toISOString()}`} className="relative">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              return (
                <CalendarCell
                  key={day.toISOString()}
                  date={day}
                  onClick={clickHandlers[dateStr]}
                  isMobile={isMobile}
                  currentMonth={currentDate.getMonth()}
                  eCount={overflowCounts[week.indexOf(day)] ?? null}
                  dayMood={moodMap[dateStr]}
                  moodOptions={moodOptions}
                  holiday={holidaysMap[dateStr]}
                  eventTotal={dayInfo[dateStr]?.count ?? 0}
                  hasConflict={dayInfo[dateStr]?.conflict ?? false}
                  repeatTitles={previewsByDay.get(dateStr)?.map((p) => p.task.title)}
                />
              );
            })}
          </div>

          {/* Paski są tylko wizualne: treść dnia ogłasza etykieta przycisku komórki. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-8 right-0 left-0 grid h-13.5 grid-cols-7 grid-rows-3 gap-0.5 sm:top-9.5 sm:h-15 sm:gap-2"
          >
            {limitedEvents.map(({ event, col, span, row, start }) => (
              <div
                key={`${event.id}-${start.toISOString()}`}
                className="flex h-4 items-center truncate rounded-md px-1.5 text-xs font-medium text-white sm:h-4.5 dark:ring-1 dark:ring-white/15"
                style={{
                  gridColumnStart: col + 1,
                  gridColumnEnd: `span ${span}`,
                  gridRowStart: row + 1,
                  backgroundColor: (event.category && categoryColors[event.category]) || DEFAULT_EVENT_COLOR,
                }}
                title={event.category ? `${event.title} (${event.category})` : event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default MonthView;
