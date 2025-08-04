import React from "react";
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
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const rangeStart = format(calendarStart, "yyyy-MM-dd");
  const rangeEnd = format(calendarEnd, "yyyy-MM-dd");

  const isMobile = useResponsive();
  const session = useSession();
  const userEmail = session?.user?.email ?? "";
  const { tasksCount } = useCalendarData(userEmail, rangeStart, rangeEnd);

  const weeks: Date[][] = [];
  let current = calendarStart;

  while (current <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 text-center font-medium">
        {weekdayNamesPL.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wIdx) => {
        const weekStart = week[0];
        const weekEnd = week[6];

        const eventsThisWeek = events
          .filter((event) => {
            const start = parseISO(event.start_time);
            const end = parseISO(event.end_time);
            return !isBefore(end, weekStart) && !isAfter(start, weekEnd);
          })
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        const rowOccupancy: boolean[][] = Array.from({ length: 3 }, () => Array(7).fill(false));

        const limitedEvents: {
          event: Event;
          start: Date;
          end: Date;
          col: number;
          span: number;
          row: number;
        }[] = [];

        const overflowCounts: number[] = Array(7).fill(0);

        for (const event of eventsThisWeek) {
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
              if (col > 6 || rowOccupancy[row][col]) {
                canPlace = false;
                break;
              }
            }
            if (canPlace) {
              for (let i = 0; i < span; i++) {
                const col = colIndex + i;
                if (col <= 6) rowOccupancy[row][col] = true;
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

        return (
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
        );
      })}
    </div>
  );
};

export default MonthView;
