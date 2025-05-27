// CustomCalendar.tsx
import React, { useState, useMemo, useEffect } from "react";
import {
  format,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  startOfWeek,
  addDays,
} from "date-fns";
import Head from "next/head";
import { Loader2 } from "lucide-react";
import { generateCalendarDays } from "../utils/calendar";
import { useResponsive } from "../hooks/useResponsive";
import { useCalendarData } from "../hooks/useCalendar";
import { Event } from "../types";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarDayDetails } from "./CalendarDayDetails";
import { pl } from "date-fns/locale";
import { useSettings } from "../hooks/useSettings";
import { useEvents } from "../hooks/useEvents";
import { useTasks } from "../hooks/useTasks";

function generateWeekDays(date: Date, weekStartsOn: 1 | 0 = 1): Date[] {
  const start = startOfWeek(date, { locale: pl, weekStartsOn });
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

interface Props {
  onEdit: (event: Event) => void;
  userEmail: string;
}

export default function CustomCalendar({ onEdit, userEmail }: Props) {
  const isMobile = useResponsive();
  const { settings } = useSettings(userEmail);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Determine displayed days
  const days = isMobile
    ? generateWeekDays(currentDate)
    : generateCalendarDays(currentDate);

  const rangeStart = addDays(new Date(format(days[0], "yyyy-MM-dd")), -31)
    .toISOString()
    .split("T")[0];
  const rangeEnd = addDays(
    new Date(format(days[days.length - 1], "yyyy-MM-dd")),
    31
  )
    .toISOString()
    .split("T")[0];

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

  // Filter data for selected day
  const detailTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((t) => t.due_date?.slice(0, 10) === selectedDate);
  }, [tasks, selectedDate]);

  const detailEvents = groupedEvents[selectedDate] || [];

  const onPrev = () =>
    isMobile
      ? setCurrentDate((d) => subWeeks(d, 1))
      : setCurrentDate((d) => subMonths(d, 1));
  const onNext = () =>
    isMobile
      ? setCurrentDate((d) => addWeeks(d, 1))
      : setCurrentDate((d) => addMonths(d, 1));
  const onToday = () => setCurrentDate(new Date());
  const onDateClick = (dateStr: string) => setSelectedDate(dateStr);
  const onBack = () => setSelectedDate("");

  if (!settings || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Kalendarz – Dzisiaj v3</title>
        <meta
          name="description"
          content="Przeglądaj swoje zadania w kalendarzu"
        />
      </Head>
      <div>
        {!selectedDate ? (
          <>
            <CalendarHeader
              currentDate={currentDate}
              onPrev={onPrev}
              onNext={onNext}
              onToday={onToday}
            />
            <CalendarGrid
              days={days}
              isMobile={isMobile}
              tasksCount={tasksCount}
              habitCounts={habitCounts}
              waterCounts={waterCounts}
              moneyCounts={moneyCounts}
              events={groupedEvents}
              onDateClick={onDateClick}
            />
          </>
        ) : (
          <CalendarDayDetails
            selectedDate={selectedDate}
            tasks={detailTasks}
            events={detailEvents}
            onEdit={onEdit}
            onBack={onBack}
            onEventsChange={refetch}
          />
        )}
      </div>
    </>
  );
}
