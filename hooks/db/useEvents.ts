// hooks/db/useEvents.ts

import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { syncLinkedEventChange } from "@/lib/calendarExport";
import { useQueryState } from "@/hooks/useQueryState";
import { ownedOrSharedFilter, quotedIsoTimestamp } from "@/lib/postgrestFilters";
import { NotSignedInError } from "@/lib/errors";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Event } from "@/types/events";
import { Person } from "@/types/people";
import { expandRepeatingEvents } from "@/lib/eventUtils";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";

import { omit } from "@/lib/objectUtils";
const NO_EVENTS: Event[] = [];

export function useVirtualBirthdayEvents(): Event[] {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const withRetry = useRetry();
  const { toast } = useToast();

  const queryVirtualEvents = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<Event[]> => {
      if (!userId) return [];
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("people")
              .select("id, first_name, last_name, birthday, nameday, priority")
              .eq("user_id", userId)
              .in("priority", [0, 1, 2])
              .abortSignal(signal),
          signal
        );
        if (error) throw error;

        const generated: Event[] = [];
        (data as Pick<Person, "id" | "first_name" | "last_name" | "birthday" | "nameday">[]).forEach((person) => {
          const fullName = `${person.first_name} ${person.last_name || ""}`.trim();
          if (person.birthday) {
            generated.push({
              id: `bday_${person.id}`,
              title: `${fullName}`,
              start_time: `${person.birthday}T00:00:00`,
              end_time: `${person.birthday}T23:59:59`,
              user_id: userId,
              repeat: "yearly",
            });
          }
          if (person.nameday) {
            generated.push({
              id: `nday_${person.id}`,
              title: `${fullName}`,
              start_time: `${person.nameday}T00:00:00`,
              end_time: `${person.nameday}T23:59:59`,
              user_id: userId,
              repeat: "yearly",
            });
          }
        });

        return generated;
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania dat urodzin/imienin.", { cause: err });
        throw err;
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const { data: virtualEvents, refetch: fetchVirtualEvents } = useQueryState<Event[]>({
    queryKey: ["people-dates", userId ?? null],
    queryFn: queryVirtualEvents,
    initial: NO_EVENTS,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    const handler = () => {
      void fetchVirtualEvents();
    };
    globalThis.addEventListener("refreshPeople", handler);
    return () => globalThis.removeEventListener("refreshPeople", handler);
  }, [fetchVirtualEvents]);

  return virtualEvents;
}

/** Data „yyyy-MM-dd” przesunięta o `days` dni. */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return format(new Date(y, m - 1, d + days), "yyyy-MM-dd");
}

export function useEvents(rangeStart: string, rangeEnd: string, virtualEvents: Event[] = []) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(false);
  const userEmailsRef = useRef<Record<string, string>>({});
  const { toast } = useToast();
  const withRetry = useRetry();
  const hasRange = Boolean(rangeStart && rangeEnd);

  // Zakres zapytania: widok ±1 dzień. Każdy zakres ma własny wpis w pamięci TanStack Query
  // (np. kolejne miesiące kalendarza), a powrót do odwiedzonego zakresu nie pyta bazy.
  const rangeQueryStart = rangeStart ? `${shiftDay(rangeStart, -1)}T00:00:00` : "";
  const rangeQueryEnd = rangeEnd ? `${shiftDay(rangeEnd, 1)}T23:59:59` : "";
  const queryEvents = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<Event[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("events")
              .select("*")
              .or(ownedOrSharedFilter("user_id", "shared_with_id", userId))
              // Tylko wydarzenia nachodzące na widok (±1 dzień zapasu na strefy czasowe)
              // oraz powtarzalne – te rozwijamy w pamięci, więc potrzebny jest ich początek.
              .or(
                `repeat.neq.none,and(start_time.lte.${quotedIsoTimestamp(rangeQueryEnd)},end_time.gte.${quotedIsoTimestamp(rangeQueryStart)})`
              )
              .abortSignal(signal),
          signal
        );
        if (error) throw error;
        const fetchedEvents = (data || []) as Event[];
        return await resolveSharedEmails(fetchedEvents, userId, supabase, userEmailsRef);
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania wydarzeń.", { cause: err });
        throw err;
      }
    },
    [supabase, userId, toast, withRetry, rangeQueryStart, rangeQueryEnd]
  );

  const {
    data: rawEvents,
    setData: setRawEvents,
    fetching,
    refetch: refetchEvents,
  } = useQueryState<Event[]>({
    queryKey: ["events", userId ?? null, rangeStart, rangeEnd],
    queryFn: queryEvents,
    initial: NO_EVENTS,
    enabled: Boolean(userId) && hasRange,
  });
  const queryClient = useQueryClient();
  // Po zmianie wydarzenia inne zakresy w pamięci (np. sąsiednie miesiące) są nieaktualne –
  // pobiorą się od nowa przy następnym wejściu. Bieżący widok ma już zmianę optymistyczną.
  const markOtherRangesStale = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["events", userId ?? null], refetchType: "none" });
  }, [queryClient, userId]);

  const fetchEvents = useCallback(async () => {
    if (hasRange) await refetchEvents();
  }, [hasRange, refetchEvents]);

  const events = useMemo(() => {
    if (!rangeStart || !rangeEnd) return rawEvents;
    const start = new Date(`${rangeStart}T00:00:00`);
    const end = new Date(`${rangeEnd}T23:59:59`);
    return expandRepeatingEvents([...rawEvents, ...virtualEvents], start, end);
  }, [rawEvents, virtualEvents, rangeStart, rangeEnd]);

  useEffect(() => {
    const handleRefresh = () => {
      void fetchEvents();
    };
    globalThis.addEventListener("refreshEvents", handleRefresh);
    return () => globalThis.removeEventListener("refreshEvents", handleRefresh);
  }, [fetchEvents]);

  const addEvent = useCallback(
    async (event: Event & { shared_with_email?: string }) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const sharedWithEmail = event.shared_with_email;
      const eventData = omit(event, ["id", "shared_with_email", "display_share_info"]);
      const optimisticEvent = { ...eventData, id: tempId, user_id: userId } as Event;
      setRawEvents((prev) => [...prev, optimisticEvent]);

      try {
        let targetSharedId = eventData.shared_with_id || null;
        if (sharedWithEmail) {
          targetSharedId = await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { data, error } = await withRetry(() =>
          supabase
            .from("events")
            .insert({ ...eventData, user_id: userId, shared_with_id: targetSharedId })
            .select()
            .single()
        );
        if (error) throw error;

        setRawEvents((prev) => prev.map((e) => (e.id === tempId ? (data as Event) : e)));
        toast.success("Dodano wydarzenie");
        markOtherRangesStale();
        return data;
      } catch {
        setRawEvents((prev) => prev.filter((e) => e.id !== tempId));
        toast.error("Błąd dodawania wydarzenia.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, setRawEvents, markOtherRangesStale]
  );

  const editEvent = useCallback(
    async (event: Event & { shared_with_email?: string }) => {
      if (event.id.startsWith("bday_") || event.id.startsWith("nday_")) {
        toast.error("Nie można edytować wydarzeń generowanych z kontaktów.");
        return;
      }
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const previous = rawEvents;
      setRawEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, ...event } : e)));

      try {
        const originalId = event.id.split("_")[0];
        const sharedWithEmail = event.shared_with_email;
        const eventData = omit(event, ["id", "user_id", "shared_with_email", "display_share_info"]);
        let targetSharedId = eventData.shared_with_id || null;

        if (sharedWithEmail !== undefined) {
          targetSharedId = sharedWithEmail.trim() === "" ? null : await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { error } = await withRetry(() =>
          supabase
            .from("events")
            .update({ ...eventData, shared_with_id: targetSharedId })
            .eq("id", originalId)
        );
        if (error) throw error;

        // Wydarzenie powiązane z Google/Outlookiem – zmiana trafia też do kalendarza zewnętrznego.
        const original = previous.find((e) => e.id === originalId);
        const remote = await syncLinkedEventChange(
          supabase,
          { ...original, ...event, id: originalId },
          "update",
          userId
        );
        if (remote.linked && !remote.ok) {
          const where = remote.label ? ` ${remote.label}` : "";
          toast.error(`Zapisano w aplikacji, ale nie w kalendarzu${where}. Spróbuj ponownie później.`);
        } else {
          toast.success("Zaktualizowano wydarzenie");
          markOtherRangesStale();
        }
      } catch {
        setRawEvents(previous);
        toast.error("Błąd edycji wydarzenia.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawEvents, toast, withRetry, setRawEvents, markOtherRangesStale]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (id.startsWith("bday_") || id.startsWith("nday_")) {
        toast.error("Nie można usuwać wydarzeń generowanych z kontaktów.");
        return;
      }
      if (!userId) {
        throw new NotSignedInError();
      }
      const ok = await toast.confirm(`Czy chcesz usunąć wydarzenie?`);
      if (!ok) return;
      setLoading(true);
      const previous = rawEvents;
      const originalId = id.split("_")[0];
      setRawEvents((prev) => prev.filter((e) => e.id !== originalId));

      try {
        // Najpierw w kalendarzu zewnętrznym: gdyby tam zostało, synchronizacja przywróciłaby je w aplikacji.
        const original = previous.find((e) => e.id === originalId);
        if (original) {
          const remote = await syncLinkedEventChange(supabase, original, "delete", userId);
          if (remote.linked && !remote.ok) {
            setRawEvents(previous);
            const where = remote.label ? ` ${remote.label}` : "";
            toast.error(`Nie udało się usunąć wydarzenia z kalendarza${where}. Wydarzenie zostało w aplikacji.`);
            return;
          }
        }
        const { error } = await withRetry(() => supabase.from("events").delete().eq("id", originalId));
        if (error) throw error;
        toast.success("Usunięto wydarzenie");
        markOtherRangesStale();
      } catch {
        setRawEvents(previous);
        toast.error("Błąd usuwania wydarzenia.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawEvents, toast, withRetry, setRawEvents, markOtherRangesStale]
  );

  return { events, loading, fetching, addEvent, editEvent, deleteEvent, fetchEvents };
}
