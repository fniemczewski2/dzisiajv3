import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../components/Layout";
import { Loader2, PlusCircleIcon } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import React, { useCallback, useState, useEffect } from "react";
import MonthView from "../components/calendar/MonthView";
import { useEvents } from "../hooks/useEvents";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  isAfter,
  isBefore,
  endOfDay,
  startOfDay,
} from "date-fns";
import type { Event } from "../types";
import { CalendarHeader } from "../components/calendar/CalendarHeader";
import CalendarDayDetails from "../components/calendar/CalendarDayDetails";
import { useSettings } from "../hooks/useSettings";
import { useTasks } from "../hooks/useTasks";
import { getAppDate, getAppDateTime } from "../lib/dateUtils";

const EventForm = dynamic(() => import("../components/calendar/EventForm"), {
  loading: () => <Loader2 className="animate-spin w-5 h-5" />,
  ssr: false,
});

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(getAppDateTime());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const session = useSession();
  const userEmail = session?.user?.email || "";

  const rangeStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { events, loading, refetch } = useEvents(userEmail, rangeStart, rangeEnd);
  const { settings } = useSettings(userEmail);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { tasks, fetchTasks } = useTasks(
    userEmail,
    settings,
    selectedDateStr ?? undefined,
    selectedDateStr ?? undefined
  );

  useEffect(() => {
    if (selectedDateStr && settings) {
      fetchTasks();
    }
  }, [selectedDateStr, settings, fetchTasks]);

  const goToPrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const openAdd = useCallback(() => {
    setEditingEvent(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  }, []);

  return (
    <>
      <Head>
        <title>Kalendarz - Dzisiaj</title>
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Kalendarz</h2>
          {!showForm && (
            <button
              onClick={openAdd}
              className="px-3 py-1.5 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {showForm && (
          <EventForm
            userEmail={userEmail}
            initialEvent={editingEvent}
            onEventsChange={() => {
              setShowForm(false);
              setEditingEvent(null);
              refetch();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {!selectedDate && (
          <CalendarHeader
            currentDate={currentDate}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
          />
        )}

        {loading ? (
          <Loader2 className="animate-spin h-6 w-6" />
        ) : selectedDate ? (
          <CalendarDayDetails
            selectedDate={selectedDateStr!}
            events={events.filter((e) => {
              const start = parseISO(e.start_time);
              const end = parseISO(e.end_time);
              return (
                !isAfter(start, endOfDay(selectedDate)) &&
                !isBefore(end, startOfDay(selectedDate))
              );
            })}
            tasks={tasks}
            onBack={() => setSelectedDate(null)}
            onEdit={openEdit}
            onEventsChange={refetch}
          />
        ) : (
          <MonthView
            currentDate={currentDate}
            events={events}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        )}
      </Layout>
    </>
  );
}

CalendarPage.auth = true;
