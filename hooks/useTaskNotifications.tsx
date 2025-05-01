// hooks/useTaskNotifications.tsx
"use client";
import { useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export function useTaskNotifications(
  userEmail: string,
  enabled: boolean,
  times: string[]
) {
  const supabase = useSupabaseClient();

  useEffect(() => {
    // Guard inside effect to maintain consistent hook calls
    if (
      !enabled ||
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    // Notify and reschedule for next day
    const notifyAndReschedule = async (hour: number, minute: number) => {
      const today = new Date().toISOString().slice(0, 10);
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { head: true, count: "exact" })
        .eq("user_name", userEmail)
        .eq("status", "pending")
        .eq("due_date", today);

      if (!error && count && count > 0) {
        new Notification("Masz zadania na dziś", {
          body: `Pozostało ${count} zadania(-ń).`,
        });
      }

      // Reschedule for next day
      setTimeout(() => notifyAndReschedule(hour, minute), 24 * 60 * 60 * 1000);
    };

    // Schedule a single notification
    const scheduleAt = (hour: number, minute: number) => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next.getTime() - now.getTime();
      setTimeout(() => notifyAndReschedule(hour, minute), delay);
    };

    // Kick off schedules based on provided times
    const startSchedules = () => {
      times.forEach((t) => {
        const [h, m] = t.split(":").map(Number);
        scheduleAt(h, m);
      });
    };

    // Request permission if needed
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") startSchedules();
      });
    } else if (Notification.permission === "granted") {
      startSchedules();
    }
  }, [supabase, userEmail, enabled, times]);
}
