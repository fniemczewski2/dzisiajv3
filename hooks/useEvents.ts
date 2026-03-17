// hooks/useEvents.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { Event } from "../types";
import { expandRepeatingEvents } from "../lib/eventUtils";
import { useAuth } from "../providers/AuthProvider";

export function useEvents(rangeStart: string, rangeEnd: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});

  const fetchEvents = useCallback(async () => {
    if (!userId || !rangeStart || !rangeEnd) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`);

      if (error) throw error;

      const fetchedEvents = (data || []) as Event[];

      const neededIds = Array.from(
        new Set(
          fetchedEvents
            .map((ev) => (ev.user_id === userId ? ev.shared_with_id : ev.user_id))
            .filter(
              (id): id is string =>
                typeof id === "string" && id !== userId && !userEmailsRef.current[id]
            )
        )
      );

      if (neededIds.length > 0) {
        const { data: emailData } = await supabase.rpc("get_emails_by_ids", {
          user_ids: neededIds,
        });
        if (emailData) {
          const newEmails = (emailData as { id: string; email: string }[]).reduce<
            Record<string, string>
          >((acc, curr) => { acc[curr.id] = curr.email; return acc; }, {});

          userEmailsRef.current = { ...userEmailsRef.current, ...newEmails };
        }
      }

      const currentEmails = userEmailsRef.current;

      const eventsWithDisplayInfo = fetchedEvents.map((event) => {
        const isOwner = event.user_id === userId;
        const targetId = isOwner ? event.shared_with_id : event.user_id;
        const email = targetId ? (currentEmails[targetId] ?? "...") : "";
        return {
          ...event,
          display_share_info: isOwner
            ? event.shared_with_id ? `Udostępniono: ${email}` : null
            : `Od: ${email}`,
        };
      });

      const start = new Date(rangeStart + "T00:00:00");
      const end   = new Date(rangeEnd   + "T23:59:59");
      setEvents(expandRepeatingEvents(eventsWithDisplayInfo, start, end));
    } finally {
      setLoading(false);
    }

  }, [supabase, userId, rangeStart, rangeEnd]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = async (event: Event & { shared_with_email?: string }) => {
    if (!userId) throw new Error("Musisz być zalogowany");
    setLoading(true);
    try {
      const { id, shared_with_email, display_share_info, ...eventData } = event as any;
      let targetSharedId = eventData.shared_with_id;

      if (shared_with_email?.includes("@")) {
        const { data: foundId } = await supabase.rpc("get_user_id_by_email", {
          email_address: shared_with_email.trim().toLowerCase(),
        });
        targetSharedId = foundId || null;
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
        targetSharedId = shared_with_email?.includes("@")
          ? (await supabase.rpc("get_user_id_by_email", {
              email_address: shared_with_email.trim().toLowerCase(),
            })).data || null
          : null;
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

  return { events, loading, addEvent, editEvent, deleteEvent, fetchEvents };
}