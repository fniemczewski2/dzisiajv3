import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  isSameDay,
  parseISO,
} from "date-fns";
import { Event } from "../types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import { getAppDate } from "../lib/dateUtils";

export function expandRepeatingEvents(
  events: Event[],
  start?: Date,
  end?: Date
): Event[] {
  const rangeStart = start ?? getAppDate();
  const rangeEnd = end ?? getAppDate();

  const result: Event[] = [];

  for (const event of events) {
    const originalStart = parseISO(event.start_time);
    const originalEnd = parseISO(event.end_time);
    const repeat = event.repeat || "none";

    if (repeat === "none") {
      if (originalEnd >= rangeStart && originalStart <= rangeEnd) {
        result.push(event);
      }
    } else {
      let currentStart = new Date(originalStart);

      while (currentStart < rangeStart) {
        currentStart =
          repeat === "weekly"
            ? addDays(currentStart, 7)
            : repeat === "monthly"
            ? addMonths(currentStart, 1)
            : repeat === "yearly"
            ? addYears(currentStart, 1)
            : addDays(currentStart, 1);
      }

      while (currentStart <= rangeEnd) {
        const duration = differenceInCalendarDays(originalEnd, originalStart);
        const instanceStart = new Date(currentStart);
        const instanceEnd = addDays(instanceStart, duration);

        result.push({
          ...event,
          id: `${event.id}_${instanceStart.toISOString()}`,
          start_time: instanceStart.toISOString(),
          end_time: instanceEnd.toISOString(),
        });

        currentStart =
          repeat === "weekly"
            ? addDays(currentStart, 7)
            : repeat === "monthly"
            ? addMonths(currentStart, 1)
            : repeat === "yearly"
            ? addYears(currentStart, 1)
            : addDays(currentStart, 1);
      }
    }
  }

  return result;
}

export function useEvents(
  userEmail: string,
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = useSupabaseClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .or(`user_name.eq.${userEmail},share.eq.${userEmail}`);

    if (error) {
      setLoading(false);
      return;
    }

    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const expanded = expandRepeatingEvents(data || [], start, end);
    setEvents(expanded);
    setLoading(false);
  };

  const deleteEvent = async (eventId: string) => {
    const originalId = eventId.split("_")[0];

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", originalId);

    if (!error) {
      // Optimistically remove from local state
      setEvents((prev) => prev.filter((e) => !e.id.startsWith(originalId)));
    } else {
      console.error("Failed to delete event:", error.message);
    }
  };

  useEffect(() => {
    if (userEmail) fetchEvents();
  }, [supabase, userEmail, rangeStart, rangeEnd]);

  return { events, loading, refetch: fetchEvents, deleteEvent };
}

export const getEventsForDay = (events: Event[], day: Date): Event[] => {
  return events.filter((event) => {
    const eventDate = parseISO(event.start_time);
    return isSameDay(eventDate, day);
  });
};
