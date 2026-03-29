import { useState, useEffect, useCallback, useRef } from "react";
import { Event } from "../types";
import { expandRepeatingEvents } from "../lib/eventUtils";
import { useAuth } from "../providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "../utils/share"; // Zaktualizowany import

export function useEvents(rangeStart: string, rangeEnd: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [events, setEvents] = useState<Event[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});

  const fetchEvents = useCallback(async () => {
    if (!userId || !rangeStart || !rangeEnd) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`);

      if (error) throw error;

      const fetchedEvents = (data || []) as Event[];

      // ZMIANA: Usunięto całą logikę wyciągania e-maili i zastąpiono jednym wywołaniem
      const eventsWithDisplayInfo = await resolveSharedEmails(
        fetchedEvents,
        userId,
        supabase,
        userEmailsRef
      );

      const start = new Date(rangeStart + "T00:00:00");
      const end   = new Date(rangeEnd   + "T23:59:59");
      
      // Rzutujemy na Event[], ponieważ resolveSharedEmails dodaje display_share_info
      setEvents(expandRepeatingEvents(eventsWithDisplayInfo as Event[], start, end));
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, rangeStart, rangeEnd]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = async (event: Event & { shared_with_email?: string }) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { id, shared_with_email, display_share_info, ...eventData } = event as any;
      let targetSharedId = eventData.shared_with_id;
      
      if (shared_with_email !== undefined) {
        targetSharedId = await getUserIdByEmail(shared_with_email, supabase);
      }

      const { error } = await supabase
        .from("events")
        .insert({ ...eventData, user_id: userId, shared_with_id: targetSharedId });
      if (error) throw error;
      
      await fetchEvents();
    } finally {
      setLoading(false);
    }
  };

  const editEvent = async (event: Event & { shared_with_email?: string }) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const originalId = event.id.split("_")[0];
      const { id, shared_with_email, display_share_info, ...eventData } = event as any;
      let targetSharedId = eventData.shared_with_id;
      
      if (shared_with_email !== undefined) {
        targetSharedId = await getUserIdByEmail(shared_with_email, supabase);
      }

      const { error } = await supabase
        .from("events")
        .update({ ...eventData, user_id: userId, shared_with_id: targetSharedId })
        .eq("id", originalId);
      if (error) throw error;
      
      await fetchEvents();
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const originalId = id.split("_")[0];
      const { error } = await supabase.from("events").delete().eq("id", originalId);
      if (error) throw error;
      await fetchEvents();
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, fetching, addEvent, editEvent, deleteEvent, fetchEvents };
}