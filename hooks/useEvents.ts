// hooks/useEvents.ts
import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Event } from "../types";
import { expandRepeatingEvents } from "../lib/eventUtils";

export function useEvents(
  rangeStart: string,
  rangeEnd: string
) {
  const session = useSession();
  const userEmail = session?.user?.email || process.env.USER_EMAIL;
  const supabase = useSupabaseClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    if (!userEmail || !rangeStart || !rangeEnd) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`user_name.eq.${userEmail},share.eq.${userEmail}`);
      
      if (error) {
        console.error("Failed to fetch events:", error.message);
        return;
      }
      const start = new Date(rangeStart + "T00:00:00");
      const end = new Date(rangeEnd + "T23:59:59");
      
      const expanded = expandRepeatingEvents(data || [], start, end);
      setEvents(expanded);
    } catch (error) {
      console.error("Error processing events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchEvents(); 
  }, [userEmail, rangeStart, rangeEnd, supabase]);

  const addEvent = async (event: Event) => {
    if (!userEmail) {
      throw new Error("User not authenticated");
    }
    
    setLoading(true);
    
    try {
      const { id, ...eventWithoutId } = event as any;
      
      const { data, error } = await supabase
        .from("events")
        .insert({ ...eventWithoutId, user_name: userEmail })
        .select(); 
      
      if (error) {
        console.error("Insert error:", error);
        throw error;
      }

      await fetchEvents();
      
    } catch (error) {
      console.error("Failed to add event:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const editEvent = async (event: Event) => {
    if (!userEmail) return;
    setLoading(true);
    
    try {
      const originalId = event.id.split("_")[0];
      const { id, ...eventData } = event;
      
      const { error } = await supabase
        .from("events")
        .update({ ...eventData, user_name: userEmail })
        .eq("id", originalId);
      
      if (error) {
        console.error("Update error:", error);
        throw error;
      }
      
      await fetchEvents();
    } catch (error) {
      console.error("Failed to edit event:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);

    try {
      const originalId = id.split("_")[0];
      
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", originalId);
      
      if (error) {
        console.error("Delete error:", error);
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, addEvent, editEvent, deleteEvent, fetchEvents };
}
