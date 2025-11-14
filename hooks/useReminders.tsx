import { useState, useEffect } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Reminder } from "../types";
import { getAppDateTime } from "../lib/dateUtils";

export function useReminders() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const today = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  .format(new Date())
  .replace(/\./g, "-") 
  .replace(/\s/g, ""); 

  useEffect(() => {
    if (!user) return;
    fetchReminders();
  }, [user]);

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_email", user?.email)
      .order("data_poczatkowa", { ascending: true });

    if (!error && data) setReminders(data);
  };

  const addReminder = async (tytul: string, data_poczatkowa: string, powtarzanie: number) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        user_email: user.email,
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
    const today = getAppDateTime(); // Returns a Date object
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
    allReminders: reminders, // <--- Dodane
    visibleReminders: getVisibleReminders(),
    addReminder,
    completeReminder,
    postponeReminder,
    deleteReminder,
    fetchReminders,
  };
}
