// hooks/useEvents.ts
import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Event } from "../types";
import { expandRepeatingEvents } from "../lib/eventUtils"; // Move the expansion logic to a utils file

export function useEvents(
  rangeStart: string,
  rangeEnd: string
) {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const supabase = useSupabaseClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
      if (!userEmail || !rangeStart || !rangeEnd) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .or(`user_name.eq.${userEmail},share.eq.${userEmail}`);
      console.log(data)
      if (error) {
        console.error("Failed to fetch events:", error.message);
        setLoading(false);
        return;
      }

      const start = new Date(rangeStart);
      const end = new Date(rangeEnd);
      const expanded = expandRepeatingEvents(data || [], start, end);
      setEvents(expanded);
      setLoading(false);
    };

  useEffect(() => { fetchEvents(); }, [userEmail, rangeStart, rangeEnd, supabase]);

  const addEvent = async (event: Event) => {
    if (!userEmail) {
      throw new Error("User not authenticated");
    }
    
    setLoading(true);
    
    try {
      // Remove id from event object if it exists (let database generate it)
      const { id, ...eventWithoutId } = event as any;
      
      const { data, error } = await supabase
        .from("events")
        .insert({ ...eventWithoutId, user_name: userEmail })
        .select(); // Add select() to return the inserted data
      
      if (error) {
        console.error("Insert error:", error);
        throw error;
      }
      
      console.log("Event inserted:", data);
      
      // Refetch to get expanded events
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
    
    const originalId = event.id.split("_")[0];
    await supabase
      .from("events")
      .update({ ...event, user_name: userEmail })
      .eq("id", originalId);
    
    // Refetch to get expanded events
    const { data } = await supabase
      .from("events")
      .select("*")
      .or(`user_name.eq.${userEmail},share.eq.${userEmail}`);
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const expanded = expandRepeatingEvents(data || [], start, end);
    setEvents(expanded);
    setLoading(false);
  };

  const deleteEvent = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);

    const originalId = id.split("_")[0];
    await supabase.from("events").delete().eq("id", originalId);
    
    // Refetch to get expanded events
    const { data } = await supabase
      .from("events")
      .select("*")
      .or(`user_name.eq.${userEmail},share.eq.${userEmail}`);
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const expanded = expandRepeatingEvents(data || [], start, end);
    setEvents(expanded);
    setLoading(false);
  };

  return { events, loading, addEvent, editEvent, deleteEvent, fetchEvents };
}