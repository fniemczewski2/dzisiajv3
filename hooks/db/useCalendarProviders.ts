// hooks/db/useCalendarProviders.ts
//
// Dostawca kalendarza, z którym powiązane jest wydarzenie (events.calendar_id → connected_calendars).
// Potrzebny tam, gdzie zachowanie Google i Outlooka się różni – np. odwołanie jednego terminu serii
// Outlook realizuje usunięciem wystąpienia, którego nie da się później przywrócić z aplikacji.

import { useCallback } from "react";
import { useQueryState } from "@/hooks/useQueryState";
import { useAuth } from "@/providers/AuthProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import type { Event } from "@/types/events";

type CalendarProvider = "google" | "outlook";
interface CalendarRow {
  id: string;
  provider: CalendarProvider;
}

const NO_CALENDARS: CalendarRow[] = [];

export function useCalendarProviders() {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const withRetry = useRetry();

  const queryCalendars = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<CalendarRow[]> => {
      if (!userId) return NO_CALENDARS;
      try {
        const { data, error } = await withRetry(
          () => supabase.from("connected_calendars").select("id, provider").eq("user_id", userId).abortSignal(signal),
          signal
        );
        if (error) throw error;
        return (data || []) as CalendarRow[];
      } catch (err) {
        // Brak tej informacji tylko zubaża komunikat – nie przerywamy pracy modułu.
        if (!isAbortError(err)) return NO_CALENDARS;
        throw err;
      }
    },
    [supabase, userId, withRetry]
  );

  const { data: calendars } = useQueryState<CalendarRow[]>({
    queryKey: ["calendar-providers", userId ?? null],
    queryFn: queryCalendars,
    initial: NO_CALENDARS,
    enabled: Boolean(userId),
  });

  /** Dostawca powiązanego kalendarza; null, gdy wydarzenie nie jest z żadnym powiązane. */
  return useCallback(
    (event: Pick<Event, "calendar_id" | "google_event_id">): CalendarProvider | null => {
      if (!event.calendar_id || !event.google_event_id) return null;
      return calendars.find((c) => c.id === event.calendar_id)?.provider ?? null;
    },
    [calendars]
  );
}
