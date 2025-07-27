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
    const durationDays =
      differenceInCalendarDays(originalEnd, originalStart) || 0;
    const repeat = event.repeat || "none";

    if (repeat === "none") {
      for (let i = 0; i <= durationDays; i++) {
        const day = addDays(originalStart, i);
        if (day >= start && day <= end) {
          result.push({
            ...event,
            start_time: day.toISOString(),
            end_time: day.toISOString(), // not used for single-day display
          });
        }
      }
    } else {
      let currentStart = new Date(originalStart);

      // przesuwanie do pierwszego wystąpienia >= start
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
        for (let i = 0; i <= durationDays; i++) {
          const day = addDays(currentStart, i);
          if (day >= start && day <= end) {
            result.push({
              ...event,
              start_time: day.toISOString(),
              end_time: day.toISOString(),
            });
          }
        }

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
