import React, { useEffect } from "react";
import { Event } from "@/types";
import { useToast } from "@/providers/ToastProvider"; 
import NoResultsState from "../NoResultsState";
import EventItem from "../calendar/EventItem";

interface Props {
  events: Event[];
  loading: boolean;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEventsChange: () => void;
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
            <EventItem
              event={event}
              loading={loading}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              onEventsChange={onEventsChange}
              userId={userId}
              userOptions={userOptions}
            />
      ))}
      {!loading && events.length === 0 && <NoResultsState text="wydarzeń" />}
    </div>
  );
}