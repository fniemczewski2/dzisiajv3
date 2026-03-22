import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../components/Layout";
import { useCallback, useState, useMemo } from "react";
import MonthView from "../components/calendar/MonthView";
import { useEvents } from "../hooks/useEvents";
import { format, startOfMonth, endOfMonth } from "date-fns";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarDayDetails from "../components/calendar/CalendarDayDetails";
import { useTasks } from "../hooks/useTasks";
import LoadingState from "../components/LoadingState";
import { AddButton } from "../components/CommonButtons";
import { useQuickAction } from "../hooks/useQuickAction";
import { useMoods } from "../hooks/useMoods";
import { DEFAULT_MOODS } from "../components/widgets/MoodTracker";
import GoogleCalendarSync from "../components/calendar/GoogleCalendarSync";
import DashboardPage from "./dashboard";

const EventForm = dynamic(() => import("../components/calendar/EventForm"), {
  loading: () => <LoadingState />,
  ssr: false,
});

export default function CalendarPage({isMain}: {isMain: boolean}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);

  const rangeStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { events, loading, fetchEvents, deleteEvent, editEvent } = useEvents(rangeStart, rangeEnd);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { tasks } = useTasks(selectedDateStr ?? undefined, selectedDateStr ?? undefined);
  const { moods } = useMoods();

  const goToPrevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleAfterAdd = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const tasksForDay = useMemo(() => {
    if (!selectedDateStr) return [];
    return tasks.filter((task) => task.due_date === selectedDateStr);
  }, [tasks, selectedDateStr]);

  useQuickAction({ onActionAdd: () => setShowForm(true) });

  return (
    <>
      <Head>
        <title>Kalendarz - Dzisiaj</title>
      </Head>
      <Layout>
        {selectedDateStr ? (
          <>
          <CalendarDayDetails
            selectedDate={selectedDateStr}
            tasks={tasksForDay}
            events={events} 
            onEventsChange={fetchEvents}
            onBack={() => setSelectedDate(null)}
            onEditEvent={editEvent}
            onDeleteEvent={deleteEvent}
            loading={loading}
            isMain={isMain}
          />
          <DashboardPage isMain={false}/>
          </>
        ) : loading && events.length === 0 ? (
          <LoadingState fullScreen />
        ) : (
        <>
          <div className="flex justify-between items-center mb-6 gap-2">
            <h2 className="text-2xl font-bold text-text">Kalendarz</h2>
            {!showForm && !selectedDate && <AddButton onClick={() => setShowForm(true)} type="button" />}
          </div>

          {showForm && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4">
              <EventForm
                currentDate={currentDate}
                selectedDate={selectedDate}
                onEventsChange={handleAfterAdd}
                onCancel={handleCancelForm}
              />
            </div>
          )}

          {!selectedDate && (
            <CalendarHeader
              currentDate={currentDate}
              onPrev={goToPrevMonth}
              onNext={goToNextMonth}
            />
          )}

          <MonthView
            currentDate={currentDate}
            events={events}
            onSelectDate={(date) => setSelectedDate(date)}
            moods={moods}
            DEFAULT_MOODS={DEFAULT_MOODS}
          />
        </>
        )}
        {!selectedDate && (
          <GoogleCalendarSync onSyncComplete={fetchEvents} />
        )}
      </Layout>
    </>
  );
}
