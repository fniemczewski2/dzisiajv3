import React from "react";
import { Event } from "@/types/events";
import NoResultsState from "../ui/NoResultsState";
import EventItem from "../calendar/EventItem";
import { SkeletonRow } from "@/components/ui/Skeleton";

interface DayEventsProps {
  events: Event[];
  fetchingEvents: boolean;
  loadingEvents: boolean;
  onEditEvent: (event: Event) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEventsChange: () => void;
  userOptions: string[];
}

export function DayEvents({ events, fetchingEvents, loadingEvents, onEditEvent, onDeleteEvent, onEventsChange, userOptions }: Readonly<DayEventsProps>) {

  if (fetchingEvents) {
    return (
      <div className="grid grid-cols-1 gap-3">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {events.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              loading={loadingEvents}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              onEventsChange={onEventsChange}
              userOptions={userOptions}
            />
      ))}
      {events.length === 0 && <NoResultsState text="wydarzeń" />}
    </div>
  );
}