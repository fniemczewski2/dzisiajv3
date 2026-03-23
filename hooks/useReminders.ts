// hooks/useReminders.ts

import { useState, useEffect, useCallback } from "react";
import { Reminder } from "../types";
import { getAppDate, getAppDateTime } from "../lib/dateUtils";
import { useAuth } from "../providers/AuthProvider";

export function useReminders() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [fetching, setFetching] = useState(false); 
  const [loading, setLoading] = useState(false);   
  
  const today = getAppDate();

  const fetchReminders = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .order("data_poczatkowa", { ascending: true });
        
      if (error) throw error;
      if (data) setReminders(data as Reminder[]);
    } finally {
      setFetching(false);
    }
  }, [supabase, userId]);

  const addReminder = useCallback(
    async (tytul: string, data_poczatkowa: string, powtarzanie: number) => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reminders")
          .insert({ user_id: userId, tytul, data_poczatkowa, powtarzanie, done: null })
          .select()
          .single();
          
        if (error) throw error;
        if (data) setReminders((prev) => [...prev, data as Reminder]);
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  const postponeReminder = useCallback(
    async (id: string, powtarzanie: number) => {
      setLoading(true);
      try {
        const dt = getAppDateTime();
        dt.setDate(dt.getDate() + 1 - powtarzanie);
        const done = dt.toISOString().slice(0, 10);

        const { data, error } = await supabase
          .from("reminders")
          .update({ done })
          .eq("id", id)
          .select()
          .single();
          
        if (error) throw error;
        if (data) setReminders((prev) => prev.map((r) => (r.id === id ? (data as Reminder) : r)));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const completeReminder = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reminders")
          .update({ done: today })
          .eq("id", id)
          .select()
          .single();
          
        if (error) throw error;
        if (data) setReminders((prev) => prev.map((r) => (r.id === id ? (data as Reminder) : r)));
      } finally {
        setLoading(false);
      }
    },
    [supabase, today]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const { error } = await supabase.from("reminders").delete().eq("id", id);
        if (error) throw error;
        setReminders((prev) => prev.filter((r) => r.id !== id));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getVisibleReminders = useCallback((): Reminder[] => {
    return reminders.filter((r) => {
      if (r.data_poczatkowa > today) return false;
      if (!r.done) return true;
      const nextDue = new Date(r.done);
      nextDue.setDate(nextDue.getDate() + r.powtarzanie);
      return today >= nextDue.toISOString().slice(0, 10);
    });
  }, [reminders, today]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  return {
    allReminders: reminders,
    visibleReminders: getVisibleReminders(),
    addReminder,
    completeReminder,
    postponeReminder,
    deleteReminder,
    fetchReminders,
    fetching, 
    loading,  
  };
}