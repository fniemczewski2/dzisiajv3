import React, { useEffect } from "react";
import { Event } from "../../types";
import { useToast } from "../../providers/ToastProvider"; 
import { DraggablePlanItem } from "./DraggablePlanItem";
import NoResultsState from "../NoResultsState";
import EventItem from "../calendar/EventItem";

interface Props {
  events: Event[];
  loading: boolean;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEventsChange: () => void;
  // ZMIANA: Otrzymywane z DayView
  userId: string;
  userOptions: string[];
}

export function DayEvents({ events, loading, onEditEvent, onDeleteEvent, onEventsChange, userId, userOptions }: Readonly<Props>) {
  const { toast } = useToast();

  useEffect(() => {
    let toastId: string | undefined;
    if (loading && toast.loading) toastId = toast.loading("Ładowanie wydarzeń...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [loading, toast]);

  return (
    <div className="grid grid-cols-1 gap-3">
      {events.map((event) => (
        <DraggablePlanItem key={event.id} id={`side-event-${event.id}`} type="event">
          <div className="w-full list-none">
            <EventItem
              event={event}
              loading={loading}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              onEventsChange={onEventsChange}
              // ZMIANA: Przekazanie w dół
              userId={userId}
              userOptions={userOptions}
            />
          </div>
        </DraggablePlanItem>
      ))}
      {!loading && events.length === 0 && <NoResultsState text="wydarzeń" />}
    </div>
  );
}