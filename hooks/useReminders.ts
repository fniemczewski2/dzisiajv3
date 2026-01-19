import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Reminder } from "../types";
import { getAppDate, getAppDateTime } from "../lib/dateUtils";

export function useReminders() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const today = getAppDate();

  useEffect(() => {
    if (!userEmail) return;
    fetchReminders();
  }, [userEmail]);

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_email", userEmail)
      .order("data_poczatkowa", { ascending: true });

    if (!error && data) setReminders(data);
  };

  const addReminder = async (tytul: string, data_poczatkowa: string, powtarzanie: number) => {
    if (!userEmail) return;
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        user_email: userEmail,
        tytul,
        data_poczatkowa,
        powtarzanie,
        done: null,
      })
      .select()
      .single();

    if (!error && data) setReminders((prev) => [...prev, data]);
  };

  const postponeReminder = async (id: string, powtarzanie: number) => {
    const today = getAppDateTime(); 
    today.setDate(today.getDate() + 1 - powtarzanie);
    const done = today.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from("reminders")
      .update({ done })
      .eq("id", id)
      .select()
      .single();

    if (data) {
      setReminders((prev) => prev.map((r) => (r.id === id ? data : r)));
    }
  };

  const completeReminder = async (id: string) => {
    const doneDate = today;
    const { data, error } = await supabase
      .from("reminders")
      .update({ done: doneDate })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      setReminders((prev) => prev.map((r) => (r.id === id ? data : r)));
    }
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (!error) setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const getVisibleReminders = () => {
    return reminders.filter((r) => {
      if (r.data_poczatkowa > today) return false;
      if (!r.done) return true;
      const nextDue = new Date(r.done);
      nextDue.setDate(nextDue.getDate() + r.powtarzanie);
      return today >= nextDue.toISOString().slice(0, 10);
    });
  };

  return {
    allReminders: reminders,
    visibleReminders: getVisibleReminders(),
    addReminder,
    completeReminder,
    postponeReminder,
    deleteReminder,
    fetchReminders,
  };
}
