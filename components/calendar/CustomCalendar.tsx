// CustomCalendar.tsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  format,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  startOfWeek,
  addDays,
} from "date-fns";
import { Loader2 } from "lucide-react";
import { generateCalendarDays } from "../../utils/calendar";
import { useResponsive } from "../../hooks/useResponsive";
import { useCalendarData } from "../../hooks/useCalendar";
import { Event } from "../../types";
import { CalendarHeader } from "./CalendarHeader";
import { pl } from "date-fns/locale";
import { useSettings } from "../../hooks/useSettings";
import { useEvents } from "../../hooks/useEvents";
import { useTasks } from "../../hooks/useTasks";
import dynamic from "next/dynamic";

const CalendarGrid = dynamic(() => import("./CalendarGrid"), {
  loading: () => <Loader2 className="animate-spin h-6 w-6" />,
});
const CalendarDayDetails = dynamic(() => import("./CalendarDayDetails"), {
  loading: () => <Loader2 className="animate-spin h-6 w-6" />,
});

function generateWeekDays(date: Date, weekStartsOn: 1 | 0 = 1): Date[] {
  const start = startOfWeek(date, { locale: pl, weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

interface Props {
  onEdit: (event: Event) => void;
  userEmail: string;
}

export default function CustomCalendar({ onEdit, userEmail }: Props) {
  const { settings } = useSettings(userEmail);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>("");
  const isMobile = useResponsive();

  const showExtendedCounts = useMemo(() => {
    return !isMobile || settings?.show_month_view === false;
  }, [isMobile, settings]);

  const days = useMemo(() => {
    return isMobile && !settings?.show_month_view
      ? generateWeekDays(currentDate)
      : generateCalendarDays(currentDate);
  }, [currentDate, isMobile, settings]);

  const rangeStart = useMemo(() => {
    return addDays(new Date(format(days[0], "yyyy-MM-dd")), -31)
      .toISOString()
      .split("T")[0];
  }, [days]);

  const rangeEnd = useMemo(() => {
    return addDays(
      new Date(format(days[days.length - 1], "yyyy-MM-dd")),
      31
    )
      .toISOString()
      .split("T")[0];
  }, [days]);

  const { tasksCount, habitCounts, waterCounts, moneyCounts } = useCalendarData(
    userEmail,
    rangeStart,
    rangeEnd
  );

  const {
    tasks,
    loading: loadingTasks,
    fetchTasks,
  } = useTasks(userEmail, settings);

  const { events, loading, refetch } = useEvents(
    userEmail,
    rangeStart,
    rangeEnd
  );

  const groupedEvents = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const ev of events) {
      const key = ev.start_time.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  useEffect(() => {
    if (settings) fetchTasks();
  }, [settings, fetchTasks]);

  const detailTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((t) => t.due_date?.slice(0, 10) === selectedDate);
  }, [tasks, selectedDate]);

  const detailEvents = groupedEvents[selectedDate] || [];

  const onPrev = useCallback(() => {
    setCurrentDate((d) =>
      isMobile && !settings?.show_month_view ? subWeeks(d, 1) : subMonths(d, 1)
    );
  }, [isMobile, settings]);

  const onNext = useCallback(() => {
    setCurrentDate((d) =>
      isMobile && !settings?.show_month_view ? addWeeks(d, 1) : addMonths(d, 1)
    );
  }, [isMobile, settings]);

  const onDateClick = (dateStr: string) => setSelectedDate(dateStr);
  const onBack = () => setSelectedDate("");

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  return (
    <>
      {!selectedDate ? (
        <>
          <CalendarHeader
            currentDate={currentDate}
            onPrev={onPrev}
            onNext={onNext}
          />
          <CalendarGrid
            days={days}
            isMobile={isMobile}
            showMonthView={settings?.show_month_view}
            events={groupedEvents}
            onDateClick={onDateClick}
            {...(showExtendedCounts && {
              tasksCount,
              habitCounts,
              waterCounts,
              moneyCounts,
            })}
          />
        </>
      ) : (
        <CalendarDayDetails
          selectedDate={selectedDate}
          tasks={detailTasks}
          events={detailEvents}
          onEdit={onEdit}
          onBack={onBack}
          tCount={tasksCount[selectedDate] || 0}
          hCount={habitCounts[selectedDate] || 0}
          wCount={waterCounts[selectedDate] || 0}
          mCount={moneyCounts[selectedDate] || 0}
          onEventsChange={refetch}
        />
      )}
    </>
  );
}
