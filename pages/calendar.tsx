import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../components/Layout";
import { useCallback, useState, useMemo, useEffect } from "react";
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
import { useToast } from "../providers/ToastProvider";

const EventForm = dynamic(() => import("../components/calendar/EventForm"), {
  ssr: false,
});

export default function CalendarPage({isMain}: {isMain: boolean}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);

  const rangeStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { events, loading, fetching, addEvent, fetchEvents } = useEvents(rangeStart, rangeEnd);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { tasks } = useTasks(selectedDateStr ?? undefined, selectedDateStr ?? undefined);
  const { moods } = useMoods();
  const { toast } = useToast();

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

  useQuickAction({ onActionAdd: () => setShowForm(true) });
    
    useEffect(() => {
        let toastId: string | undefined;
        
        if (fetching && toast.loading) {
          toastId = toast.loading("Ładowanie wydarzeń...");
        }
    
        return () => {
          if (toastId && toast.dismiss) {
            toast.dismiss(toastId);
          }
        };
    }, [fetching, toast]);

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
            onBack={() => setSelectedDate(null)}
          />
          </>
        ) : (
        <>
          <div className="flex justify-between items-center mb-6 gap-2">
            <h2 className="text-2xl font-bold text-text">Kalendarz</h2>
            {!showForm && !selectedDate && <AddButton onClick={() => setShowForm(true)} type="button" />}
          </div>

          {showForm && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4">
              <EventForm
                addEvent={addEvent}
                currentDate={currentDate}
                selectedDate={selectedDate}
                onEventsChange={handleAfterAdd}
                onCancel={handleCancelForm}
                loading={loading}
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
