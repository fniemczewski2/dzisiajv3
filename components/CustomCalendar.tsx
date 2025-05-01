import React, { useState, useEffect } from "react";
import {
  format,
  parseISO,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  startOfWeek,
  addDays,
} from "date-fns";
import Head from "next/head";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2 } from "lucide-react";
import { generateCalendarDays } from "../utils/calendar";
import { useResponsive } from "../hooks/useResponsive";
import { useCalendarData } from "../hooks/useCalendar";
import { Task } from "../types";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { pl } from "date-fns/locale";
import { useSettings } from "../hooks/useSettings";

// Generate a single week of dates around a given date
function generateWeekDays(date: Date, weekStartsOn: 1 | 0 = 1): Date[] {
  const start = startOfWeek(date, { locale: pl, weekStartsOn });
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

export default function CustomCalendar() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || "";
  const isMobile = useResponsive();
  const { settings } = useSettings(userEmail);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Determine displayed days: full month or week
  const days = isMobile
    ? generateWeekDays(currentDate)
    : generateCalendarDays(currentDate);

  const rangeStart = format(days[0], "yyyy-MM-dd");
  const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");
  const { tasksCount, habitCounts, waterCounts } = useCalendarData(
    userEmail,
    rangeStart,
    rangeEnd
  );

  // detail state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [detailTasks, setDetailTasks] = useState<Task[]>([]);

  // fetch task details on date select
  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_name", userEmail)
        .eq("due_date", selectedDate);
      setDetailTasks(tasksData || []);
    })();
  }, [selectedDate, supabase, userEmail]);

  if (!settings || session === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );

  const onPrev = () =>
    isMobile
      ? setCurrentDate((d) => subWeeks(d, 1))
      : setCurrentDate((d) => subMonths(d, 1));
  const onNext = () =>
    isMobile
      ? setCurrentDate((d) => addWeeks(d, 1))
      : setCurrentDate((d) => addMonths(d, 1));
  const onToday = () => setCurrentDate(new Date());
  const onDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  return (
    <>
      <Head>
        <title>Kalendarz – Dzisiaj v3</title>
        <meta
          name="description"
          content="Przeglądaj swoje zadania w kalendarzu"
        />
      </Head>
      <div className="space-y-4">
        <CalendarHeader
          currentDate={currentDate}
          isMobile={isMobile}
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
          onDateClick={onDateClick}
        />
        {selectedDate && (
          <div className="bg-card p-4 shadow rounded space-y-4">
            <h3 className="font-semibold">
              {format(parseISO(selectedDate), "d MMMM yyyy", { locale: pl })}
            </h3>
            <div>
              <h4 className="font-medium mb-1">Zadania</h4>
              {detailTasks.length ? (
                <ul className="list-disc pl-5 space-y-1">
                  {detailTasks.map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                </ul>
              ) : (
                <p>Brak zadań</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
