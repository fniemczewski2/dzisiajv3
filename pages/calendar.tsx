import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../components/Layout";
import { PlusCircleIcon } from "lucide-react";
import { useCallback, useState, useMemo } from "react";
import MonthView from "../components/calendar/MonthView";
import { useEvents } from "../hooks/useEvents";
import {
  format,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import type { Event } from "../types";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarDayDetails from "../components/calendar/CalendarDayDetails";
import { useTasks } from "../hooks/useTasks";
import LoadingState from "../components/LoadingState";
import { se } from "date-fns/locale";
import { AddButton } from "../components/CommonButtons";

const EventForm = dynamic(() => import("../components/calendar/EventForm"), {
  loading: () => <LoadingState />,
  ssr: false,
});

const parseEventDate = (timestamp: string): Date => {
  const cleanTimestamp = timestamp.replace(/\+\d{2}$/, "").replace(" ", "T").split(".")[0];
  const [datePart, timePart] = cleanTimestamp.split("T");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes, seconds] = (timePart || "00:00:00").split(":");
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds || "0")
  );
};


const eventSpansDate = (event: Event, selectedDate: Date): boolean => {
  const eventStart = parseEventDate(event.start_time);
  const eventEnd = parseEventDate(event.end_time);

  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const eventStartDateOnly = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  const eventEndDateOnly = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
  
  return selectedDateOnly >= eventStartDateOnly && selectedDateOnly <= eventEndDateOnly;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const rangeStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { events, loading, fetchEvents,deleteEvent, editEvent } = useEvents(rangeStart, rangeEnd);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { tasks } = useTasks(
    selectedDateStr ?? undefined,
    selectedDateStr ?? undefined
  );

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

  const openNew = useCallback(() => {
    setEditingEvent(null);
    setShowForm(true);
  }, []);

  const handleEventsChange = useCallback(() => {
    setShowForm(false);
    setEditingEvent(null);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingEvent(null);
  }, []);

  const eventsForDay = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((event) => eventSpansDate(event, selectedDate));
  }, [events, selectedDate]);

  const tasksForDay = useMemo(() => {
    if (!selectedDateStr) return [];
    return tasks.filter((task) => task.due_date === selectedDateStr);
  }, [tasks, selectedDateStr]);

  return (
    <>
      <Head>
        <title>Kalendarz - Dzisiaj</title>
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Kalendarz</h2>
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {showForm && (
          <EventForm
            currentDate={currentDate}
            onEventsChange={handleEventsChange}
            onCancel={handleCancelForm}
            selectedDate={selectedDate}
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
          <LoadingState />
        ) : selectedDateStr ? (
          <CalendarDayDetails
            selectedDate={selectedDateStr}
            tasks={tasksForDay}
            events={eventsForDay}
            onEventsChange={fetchEvents}
            onBack={() => setSelectedDate(null)}
            onEditEvent={editEvent}
            onDeleteEvent={deleteEvent}
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