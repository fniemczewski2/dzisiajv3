import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  parseISO,
} from "date-fns";
import { Event } from "../types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";

export function expandRepeatingEvents(
  events: Event[],
  start: Date,
  end: Date
): Event[] {
  const result: Event[] = [];

  for (const event of events) {
    const originalStart = parseISO(event.start_time);
    const originalEnd = parseISO(event.end_time);
    const repeat = event.repeat || "none";

    if (repeat === "none") {
      if (originalEnd >= start && originalStart <= end) {
        result.push(event);
      }
    } else {
      let currentStart = new Date(originalStart);

      while (currentStart < start) {
        currentStart =
          repeat === "weekly"
            ? addDays(currentStart, 7)
            : repeat === "monthly"
            ? addMonths(currentStart, 1)
            : repeat === "yearly"
            ? addYears(currentStart, 1)
            : addDays(currentStart, 1);
      }

      while (currentStart <= end) {
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

  useEffect(() => {
    if (userEmail) fetchEvents();
  }, [supabase, userEmail, rangeStart, rangeEnd]);

  return { events, loading, refetch: fetchEvents };
}
