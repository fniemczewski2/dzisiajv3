// components/calendar/MonthView.tsx

import React, { useMemo, memo } from "react";
import { Event, MoodEntry, MoodOption } from "../../types";
import {
  startOfMonth, endOfMonth, addDays, startOfWeek, endOfWeek,
  isBefore, isAfter, max, min, differenceInCalendarDays, format, endOfDay,
} from "date-fns";
import CalendarCell from "./CalendarCell";
import { useCalendarData } from "../../hooks/useCalendar";
import { useResponsive } from "../../hooks/useResponsive";
import { getPolishHolidays } from "../../lib/holidays";
import { parseEventDate } from "../../lib/dateUtils";

interface Props {
  events: Event[];
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  moods: MoodEntry[];
  DEFAULT_MOODS: MoodOption[];
}

const weekdayNamesPL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

type PlacedEvent = {
  event: Event;
  start: Date;
  end: Date;
  col: number;
  span: number;
  row: number;
};

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
    return bSpan - aSpan; // Sort by longest span first
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

  const colOccupancy: boolean[][] = Array.from({ length: 7 }, () => new Array(3).fill(false));
  const limitedEvents: PlacedEvent[] = [];
  const overflowCounts: number[] = new Array(7).fill(0);

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
  DEFAULT_MOODS,
}: Readonly<Props>) {
  const isMobile = useResponsive();

  const { calendarStart, calendarEnd, rangeStart, rangeEnd } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd   = endOfMonth(currentDate);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
    return {
      monthStart,
      monthEnd,
      calendarStart: calStart,
      calendarEnd: calEnd,
      rangeStart: format(calStart, "yyyy-MM-dd"),
      rangeEnd:   format(calEnd,   "yyyy-MM-dd"),
    };
  }, [currentDate]);

  const { tasksCount } = useCalendarData(rangeStart, rangeEnd);

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

  // REFACTORED: Heavy logic extracted to `processWeekLayout`
  const weekData = useMemo(() => {
    return weeks.map((week) => processWeekLayout(week, events));
  }, [weeks, events]);

  const moodMap = useMemo(() => {
    const map: Record<string, MoodEntry> = {};
    moods.forEach((m) => { map[m.date] = m; });
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
      <div className="grid grid-cols-7 text-center font-bold text-xs sm:text-sm text-textMuted uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-gray-800">
        {weekdayNamesPL.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      {weekData.map(({ week, limitedEvents, overflowCounts }, wIdx) => (
        <div key={`week-${week}`} className="relative">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              return (
                <CalendarCell
                  key={day.toISOString()}
                  date={day}
                  onClick={clickHandlers[dateStr]}
                  tCount={tasksCount[dateStr] ?? null}
                  isMobile={isMobile}
                  currentMonth={currentDate.getMonth()}
                  eCount={overflowCounts[week.indexOf(day)] ?? null}
                  dayMood={moodMap[dateStr]}
                  DEFAULT_MOODS={DEFAULT_MOODS}
                  holiday={holidaysMap[dateStr]}
                />
              );
            })}
          </div>

          <div className="absolute top-[32px] sm:top-[38px] left-0 right-0 h-[54px] sm:h-[60px] grid grid-cols-7 grid-rows-3 gap-0.5 sm:gap-2 pointer-events-none">
            {limitedEvents.map(({ event, col, span, row, start }) => (
              <div
                key={`${event.id}-${start.toISOString()}`}
                className="bg-primary opacity-90 text-white text-[10px] sm:text-xs rounded-sm truncate h-[16px] sm:h-[18px] px-1 flex items-center shadow-sm"
                style={{ gridColumnStart: col + 1, gridColumnEnd: `span ${span}`, gridRowStart: row + 1 }}
                title={event.title}
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