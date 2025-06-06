import { useState, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Task } from "../types";
import { Settings } from "../types";

export function useTasks(userEmail: string, settings: Settings | null) {
  const supabase = useSupabaseClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!settings) return;
    setLoading(true);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    let query = supabase
      .from("tasks")
      .select("*")
      .or(`user_name.eq.${userEmail},for_user.eq.${userEmail}`)
      .gte("due_date", oneMonthAgo.toISOString());

    if (!settings.show_completed) {
      query = query.neq("status", "done");
    }

    const { data, error } = await query;
    if (error) {
      console.error("Fetch tasks failed:", error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const sortedData = [...data]; // Clone before sorting

    const getPriority = (task: Task) =>
      task.status === "waiting for acceptance" ? 0 : 1;

    switch (settings.sort_order) {
      case "due_date":
        sortedData.sort((a, b) => {
          const aPriority = getPriority(a);
          const bPriority = getPriority(b);
          if (aPriority !== bPriority) return aPriority - bPriority;

          return (
            new Date(a.due_date ?? 0).getTime() -
            new Date(b.due_date ?? 0).getTime()
          );
        });
        break;

      case "due_date_alphabetical":
        sortedData.sort((a, b) => {
          const aPriority = getPriority(a);
          const bPriority = getPriority(b);
          if (aPriority !== bPriority) return aPriority - bPriority;

          const dateDiff =
            new Date(a.due_date ?? 0).getTime() -
            new Date(b.due_date ?? 0).getTime();
          if (dateDiff !== 0) return dateDiff;

          return (a.title || "").localeCompare(b.title || "");
        });
        break;

      case "priority":
        sortedData.sort((a, b) => {
          const aPriority = getPriority(a);
          const bPriority = getPriority(b);
          if (aPriority !== bPriority) return aPriority - bPriority;

          return (a.priority ?? Infinity) - (b.priority ?? Infinity);
        });
        break;

      default:
        sortedData.sort((a, b) => {
          const aPriority = getPriority(a);
          const bPriority = getPriority(b);
          if (aPriority !== bPriority) return aPriority - bPriority;

          return (a.title || "").localeCompare(b.title || "");
        });
    }

    sortedData.sort((a, b) => {
      const isADone = a.status === "done" ? 1 : 0;
      const isBDone = b.status === "done" ? 1 : 0;
      return isADone - isBDone;
    });

    setTasks(sortedData);
    setLoading(false);
  }, [supabase, userEmail, settings]);

  return { tasks, loading, fetchTasks };
}
