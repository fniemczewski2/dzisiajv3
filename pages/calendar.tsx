import dynamic from "next/dynamic";
import { useCallback, useState, useEffect } from "react";
import MonthView from "@/components/calendar/MonthView";
import { useEvents } from "@/hooks/db/useEvents";
import { format, startOfMonth, endOfMonth } from "date-fns";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import { AddButton } from "@/components/ui/CommonButtons";
import { useQuickAction } from "@/lib/useQuickAction";
import { useMoods } from "@/hooks/db/useMoods";
import { DEFAULT_MOODS } from "@/components/widgets/MoodTracker";
import ConnectedCalendars from "@/components/calendar/ConnectedCalendars";
import { useToast } from "@/providers/ToastProvider";
import Seo from "@/components/ui/SEO";
import { useRouter } from "next/router";

const EventForm = dynamic(() => import("../components/calendar/EventForm"), { ssr: false });
const DayView = dynamic(() => import("../components/dashboard/DayView"), { ssr: false });

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);

  const rangeStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { events, fetching, addEvent, fetchEvents } = useEvents(rangeStart, rangeEnd);

  const { moods } = useMoods();
  const { toast } = useToast();

  const goToPrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleAfterAdd = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCancelForm = useCallback(() => setShowForm(false), []);

  useQuickAction({ onActionAdd: () => setShowForm(true) });
    
  useEffect(() => {
      let toastId: string | undefined;
      if (fetching && toast.loading) toastId = toast.loading("Ładowanie wydarzeń...");
      return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  useEffect(() => {
    if (router.query.reset === "true") {
      setSelectedDate(null); 
      router.replace("/calendar", undefined, { shallow: true });
    }
  }, [router.query.reset, router]);

  return (
    <>
      <Seo
        title="Kalendarz - Dzisiaj v3"
        description="Planuj nadchodzące wydarzenia, monitoruj terminy i synchronizuj swoje plany z Kalendarzem Google oraz Outlookiem."
        canonical="https://dzisiaj.fun/calendar"
        keywords="kalendarz, planowanie, terminy, harmonogram, kalendarz google, outlook"
      />   
        
        {selectedDate ? (
          <DayView date={selectedDate} onDateChange={setSelectedDate} />
        ) : (
        <>
          <div className="flex justify-between items-center mb-6 gap-2">
            <h2 className="text-2xl font-bold text-text">Kalendarz</h2>
            {!showForm && !selectedDate && <AddButton onClick={() => setShowForm(true)} />}
          </div>

          {showForm && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4">
              <EventForm addEvent={addEvent} currentDate={currentDate} selectedDate={selectedDate} onEventsChange={handleAfterAdd} onCancel={handleCancelForm} loading={fetching} />
            </div>
          )}

          {!selectedDate && <CalendarHeader currentDate={currentDate} onPrev={goToPrevMonth} onNext={goToNextMonth} />}

          <MonthView currentDate={currentDate} events={events} onSelectDate={(date) => setSelectedDate(date)} moods={moods} DEFAULT_MOODS={DEFAULT_MOODS} />
        </>
        )}
        {!selectedDate && (
          <div className="mt-8 space-y-4">
            <ConnectedCalendars />
          </div>
        )}
    </>
  );
}