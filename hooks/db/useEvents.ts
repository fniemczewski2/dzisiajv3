// hooks/useEvents.ts
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Event } from "@/types/events";
import { expandRepeatingEvents } from "@/lib/eventUtils";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

export function useEvents(rangeStart: string, rangeEnd: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const userEmailsRef = useRef<Record<string, string>>({});
  const { toast } = useToast();
  const withRetry = useRetry();

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching && toast.loading) toastId = toast.loading("Ładowanie wydarzeń...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  // Rozwijanie wydarzeń cyklicznych liczone jest tylko wtedy, gdy realnie zmienią się
  // dane źródłowe lub zakres dat - nie przy każdym renderze.
  const events = useMemo(() => {
    if (!rangeStart || !rangeEnd) return rawEvents;
    const start = new Date(`${rangeStart}T00:00:00`);
    const end = new Date(`${rangeEnd}T23:59:59`);
    return expandRepeatingEvents(rawEvents, start, end);
  }, [rawEvents, rangeStart, rangeEnd]);

  const fetchEvents = useCallback(async () => {
    if (!rangeStart || !rangeEnd) return;
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("events").select("*").or(`user_id.eq.${userId},shared_with_id.eq.${userId}`)
      );
      if (error) throw error;

      const fetchedEvents = (data || []) as Event[];
      const eventsWithDisplayInfo = await resolveSharedEmails(fetchedEvents, userId, supabase, userEmailsRef);

      const { data: peopleData, error: peopleError } = await withRetry(async () =>
        supabase.from("people").select("*").eq("user_id", userId).in("priority", [0, 1, 2])
      );

      const virtualEvents: Event[] = [];
      if (!peopleError && peopleData) {
        peopleData.forEach((person: any) => {
          if (person.birthday) {
            virtualEvents.push({
              id: `bday_${person.id}`,
              title: `🎂 Urodziny: ${person.first_name} ${person.last_name || ""}`.trim(),
              start_time: `${person.birthday}T00:00:00`,
              end_time: `${person.birthday}T23:59:59`,
              user_id: userId,
              repeat: "yearly",
            });
          }
          if (person.nameday) {
            virtualEvents.push({
              id: `nday_${person.id}`,
              title: `🎉 Imieniny: ${person.first_name} ${person.last_name || ""}`.trim(),
              start_time: `${person.nameday}T00:00:00`,
              end_time: `${person.nameday}T23:59:59`,
              user_id: userId,
              repeat: "yearly",
            });
          }
        });
      }

      setRawEvents([...eventsWithDisplayInfo, ...virtualEvents]);
    } catch {
      toast.error("Błąd pobierania wydarzeń.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, rangeStart, rangeEnd, toast, withRetry]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const handleRefresh = () => fetchEvents();
    globalThis.addEventListener("refreshEvents", handleRefresh);
    return () => globalThis.removeEventListener("refreshEvents", handleRefresh);
  }, [fetchEvents]);

  const addEvent = useCallback(
    async (event: Event & { shared_with_email?: string }) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const { id: _id, shared_with_email: sharedWithEmail, display_share_info: _displayShareInfo, ...eventData } = event;
      const optimisticEvent = { ...eventData, id: tempId, user_id: userId } as Event;
      setRawEvents((prev) => [...prev, optimisticEvent]);

      try {
        let targetSharedId = (eventData as any).shared_with_id || null;
        if (sharedWithEmail) {
          targetSharedId = await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { data, error } = await withRetry(async () =>
          supabase
            .from("events")
            .insert({ ...eventData, user_id: userId, shared_with_id: targetSharedId })
            .select()
            .single()
        );
        if (error) throw error;

        setRawEvents((prev) => prev.map((e) => (e.id === tempId ? (data as Event) : e)));
        toast.success("Dodano wydarzenie");
        return data;
      } catch {
        setRawEvents((prev) => prev.filter((e) => e.id !== tempId));
        toast.error("Błąd dodawania wydarzenia.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry]
  );

  const editEvent = useCallback(
    async (event: Event & { shared_with_email?: string }) => {
      if (event.id.startsWith("bday_") || event.id.startsWith("nday_")) {
        toast.error("Nie można edytować wydarzeń generowanych z kontaktów.");
        return;
      }
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = rawEvents;
      setRawEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, ...event } : e)));

      try {
        const originalId = event.id.split("_")[0];
        const { id: _id, shared_with_email: sharedWithEmail, display_share_info: _displayShareInfo, ...eventData } = event;
        let targetSharedId = (eventData as any).shared_with_id || null;

        if (sharedWithEmail !== undefined) {
          targetSharedId = sharedWithEmail.trim() === "" ? null : await getUserIdByEmail(sharedWithEmail, supabase);
        }

        const { error } = await withRetry(async () =>
          supabase
            .from("events")
            .update({ ...eventData, user_id: userId, shared_with_id: targetSharedId })
            .eq("id", originalId)
        );
        if (error) throw error;

        toast.success("Zaktualizowano wydarzenie");
      } catch {
        setRawEvents(previous);
        toast.error("Błąd edycji wydarzenia.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawEvents, toast, withRetry]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (id.startsWith("bday_") || id.startsWith("nday_")) {
        toast.error("Nie można usuwać wydarzeń generowanych z kontaktów.");
        return;
      }
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć wydarzenie?`);
      if (!ok) return;
      setLoading(true);
      const previous = rawEvents;
      const originalId = id.split("_")[0];
      setRawEvents((prev) => prev.filter((e) => e.id !== originalId));

      try {
        const { error } = await withRetry(async () => supabase.from("events").delete().eq("id", originalId));
        if (error) throw error;
        toast.success("Usunięto wydarzenie");
      } catch {
        setRawEvents(previous);
        toast.error("Błąd usuwania wydarzenia.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawEvents, toast, withRetry]
  );

  return { events, loading, fetching, addEvent, editEvent, deleteEvent, fetchEvents };
}
