import React from "react";
import { Event } from "../../types";
import { DraggablePlanItem } from "./DraggablePlanItem";
import NoResultsState from "../NoResultsState";
import EventItem from "../calendar/EventItem";

interface Props {
  events: Event[];
  loading: boolean;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEventsChange: () => void;
}

export function DayEvents({ events, loading, onEditEvent, onDeleteEvent, onEventsChange }: Props) {
  
  if (events.length === 0) return <NoResultsState text="wydarzeń" />;

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
            />
          </div>
        </DraggablePlanItem>
      ))}
    </div>
  );
}