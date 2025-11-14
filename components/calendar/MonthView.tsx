import React, { useMemo } from "react";
import { Event } from "../../types";
import {
  startOfMonth,
  endOfMonth,
  addDays,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  parseISO,
  max,
  min,
  differenceInCalendarDays,
  format,
  endOfDay,
} from "date-fns";
import CalendarCell from "./NewCalendarCell";
import { useCalendarData } from "../../hooks/useCalendar";
import { useSession } from "@supabase/auth-helpers-react";
import { useResponsive } from "../../hooks/useResponsive";

interface Props {
  events: Event[];
  currentDate: Date;
  onSelectDate: (date: Date) => void;
}

const weekdayNamesPL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

const MonthView: React.FC<Props> = ({ events, currentDate, onSelectDate }) => {
  const isMobile = useResponsive();
  const session = useSession();
  const userEmail = session?.user?.email ?? "";

  // Memoize calendar boundaries
  const { monthStart, monthEnd, calendarStart, calendarEnd, rangeStart, rangeEnd } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return {
      monthStart,
      monthEnd,
      calendarStart,
      calendarEnd,
      rangeStart: format(calendarStart, "yyyy-MM-dd"),
      rangeEnd: format(calendarEnd, "yyyy-MM-dd"),
    };
  }, [currentDate]);

  const { tasksCount } = useCalendarData(userEmail, rangeStart, rangeEnd);

  // Memoize weeks calculation
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

  // Memoize events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    
    events.forEach((event) => {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      
      // Add event to all dates it spans
      let current = new Date(start);
      while (current <= end) {
        const dateKey = format(current, "yyyy-MM-dd");
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(event);
        current = addDays(current, 1);
      }
    });

    return map;
  }, [events]);

  // Memoize week data to avoid recalculating on every render
  const weekData = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0];
      const weekEnd = endOfDay(week[6]);

      // Filter events for this week
      const eventsThisWeek = events.filter((event) => {
        const start = parseISO(event.start_time);
        const end = parseISO(event.end_time);
        return !(isBefore(end, weekStart) || isAfter(start, weekEnd));
      });

      // Sort by span length (longer events first)
      const sortedEvents = [...eventsThisWeek].sort((a, b) => {
        const aStart = parseISO(a.start_time);
        const aEnd = parseISO(a.end_time);
        const bStart = parseISO(b.start_time);
        const bEnd = parseISO(b.end_time);

        const aSpan = differenceInCalendarDays(min([aEnd, weekEnd]), max([aStart, weekStart])) + 1;
        const bSpan = differenceInCalendarDays(min([bEnd, weekEnd]), max([bStart, weekStart])) + 1;

        return bSpan - aSpan;
      });

      // Calculate event placement
      const colOccupancy: boolean[][] = Array.from({ length: 7 }, () => Array(3).fill(false));
      const limitedEvents: {
        event: Event;
        start: Date;
        end: Date;
        col: number;
        span: number;
        row: number;
      }[] = [];
      const overflowCounts: number[] = Array(7).fill(0);

      for (const event of sortedEvents) {
        const start = parseISO(event.start_time);
        const end = parseISO(event.end_time);

        const segStart = max([start, weekStart]);
        const segEnd = min([end, weekEnd]);

        const colIndex = differenceInCalendarDays(segStart, weekStart);
        const span = differenceInCalendarDays(segEnd, segStart) + 1;

        let placed = false;

        for (let row = 0; row < 3; row++) {
          let canPlace = true;
          for (let i = 0; i < span; i++) {
            const col = colIndex + i;
            if (col > 6 || colOccupancy[col][row]) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            for (let i = 0; i < span; i++) {
              const col = colIndex + i;
              if (col <= 6) colOccupancy[col][row] = true;
            }
            limitedEvents.push({ event, start: segStart, end: segEnd, col: colIndex, span, row });
            placed = true;
            break;
          }
        }

        if (!placed) {
          for (let i = 0; i < span; i++) {
            const col = colIndex + i;
            if (col <= 6) overflowCounts[col]++;
          }
        }
      }

      return { week, limitedEvents, overflowCounts };
    });
  }, [weeks, events]);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 text-center font-medium">
        {weekdayNamesPL.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {weekData.map(({ week, limitedEvents, overflowCounts }, wIdx) => (
        <div key={wIdx} className="relative">
          <div className="grid grid-cols-7 gap-1">
            {week.map((day, dayIdx) => {
              const dateStr = format(day, "yyyy-MM-dd");
              return (
                <CalendarCell
                  key={day.toISOString()}
                  date={day}
                  onClick={() => onSelectDate(day)}
                  tCount={tasksCount[dateStr] || null}
                  isMobile={isMobile}
                  currentMonth={currentDate.getMonth()}
                  eCount={overflowCounts[dayIdx] || null}
                />
              );
            })}
          </div>

          <div className="absolute top-[32px] left-0 right-0 h-[54px] sm:h-[60px] grid grid-cols-7 grid-rows-3 gap-1 pointer-events-none">
            {limitedEvents.map(({ event, col, span, row, start }) => (
              <div
                key={event.id + start.toISOString()}
                className="bg-blue-200 text-[11px] sm:text-xs rounded-sm truncate h-[16px] sm:h-[18px] opacity-75 px-1"
                style={{
                  gridColumnStart: col + 1,
                  gridColumnEnd: `span ${span}`,
                  gridRowStart: row + 1,
                }}
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
};

export default React.memo(MonthView);