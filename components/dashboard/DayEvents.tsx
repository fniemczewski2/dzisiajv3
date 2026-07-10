import React, { useEffect } from "react";
import { Event } from "@/types";
 
import NoResultsState from "../ui/NoResultsState";
import EventItem from "../calendar/EventItem";

interface Props {
  events: Event[];
  fetchingEvents: boolean;
  loadingEvents: boolean;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEventsChange: () => void;
  userId: string;
  userOptions: string[];
}

export function DayEvents({ events, fetchingEvents, loadingEvents, onEditEvent, onDeleteEvent, onEventsChange, userId, userOptions }: Readonly<Props>) {

  return (
    <div className="grid grid-cols-1 gap-3">
      {events.map((event) => (
            <EventItem
              event={event}
              loading={loadingEvents}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              onEventsChange={onEventsChange}
              userId={userId}
              userOptions={userOptions}
            />
      ))}
      {!fetchingEvents && events.length === 0 && <NoResultsState text="wydarzeń" />}
    </div>
  );
}