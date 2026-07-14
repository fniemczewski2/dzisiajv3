// hooks/useEvents.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { Event } from "@/types";
import { expandRepeatingEvents } from "@/lib/eventUtils";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share"; 
import { useToast } from "@/providers/ToastProvider";

export function useEvents(rangeStart: string, rangeEnd: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [events, setEvents] = useState<Event[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const userEmailsRef = useRef<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie wydarzeń...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchEvents = useCallback(async () => {
    if (!rangeStart || !rangeEnd) return;
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`user_id.eq.${userId},shared_with_id.eq.${userId}`);
      
      if (error) throw error;

      const fetchedEvents = (data || []) as Event[];

      const eventsWithDisplayInfo = await resolveSharedEmails(
        fetchedEvents,
        userId,
        supabase,
        userEmailsRef
      );

      const { data: peopleData, error: peopleError } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", userId)
        .in("priority", [0, 1, 2]);

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
      const allEvents = [...eventsWithDisplayInfo, ...virtualEvents];

      const start = new Date(rangeStart + "T00:00:00");
      const end   = new Date(rangeEnd   + "T23:59:59");
      
      setEvents(expandRepeatingEvents(allEvents, start, end));
    } catch (error) {
      console.error("Błąd pobierania wydarzeń:", error);
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, rangeStart, rangeEnd]);

  useEffect(() => { 
    fetchEvents(); 
  }, [fetchEvents]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchEvents();
    };
    globalThis.addEventListener("refreshEvents", handleRefresh);
    return () => {
      globalThis.removeEventListener("refreshEvents", handleRefresh);
    };
  }, [fetchEvents]);

  const addEvent = async (event: Event & { shared_with_email?: string }) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const { id, shared_with_email, display_share_info, ...eventData } = event as any;
      let targetSharedId = eventData.shared_with_id || null;
      
      if (shared_with_email) {
        targetSharedId = await getUserIdByEmail(shared_with_email, supabase);
      }

      const { data, error } = await supabase
        .from("events")
        .insert({ ...eventData, user_id: userId, shared_with_id: targetSharedId })
        .select()
        .single();
      
      if (error) throw error;
      await fetchEvents();
      
      return data;
    } finally {
      setLoading(false);
    }
  };

  const editEvent = async (event: Event & { shared_with_email?: string }) => {
    if (event.id.startsWith("bday_") || event.id.startsWith("nday_")) {
      console.warn("Nie można edytować wydarzeń generowanych z kontaktów z poziomu kalendarza.");
      return;
    }

    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, ...event } : e));
    try {
      const originalId = event.id.split("_")[0];
      const { id, shared_with_email, display_share_info, ...eventData } = event as any;
      let targetSharedId = eventData.shared_with_id || null;
      
      if (shared_with_email !== undefined) {
        if (shared_with_email.trim() === "") {
          targetSharedId = null; 
        } else {
          targetSharedId = await getUserIdByEmail(shared_with_email, supabase);
        }
      }

      const { error } = await supabase
        .from("events")
        .update({ ...eventData, user_id: userId, shared_with_id: targetSharedId })
        .eq("id", originalId);

      if (error) {
        toast.error('Błąd edycji wydarzenia.');
        throw error;
      }

    } catch (error) {
      throw error;
    } finally {
      fetchEvents();
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (id.startsWith("bday_") || id.startsWith("nday_")) {
      console.warn("Nie można usuwać wydarzeń generowanych z kontaktów z poziomu kalendarza.");
      return;
    }

    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }

    const ok = await toast.confirm(
      `Czy chcesz usunąć wydarzenie?`
    );
    if (!ok) return;
    setLoading(true);

    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      const originalId = id.split("_")[0];
      const { error } = await supabase.from("events").delete().eq("id", originalId);
      if (error) {
        toast.error('Błąd usuwania wydarzenia.');
        throw error;
      }
      
    } catch {
      fetchEvents();
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, fetching, addEvent, editEvent, deleteEvent, fetchEvents };
}