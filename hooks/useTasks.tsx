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

    let query = supabase
      .from("tasks")
      .select("*")
      .or(`user_name.eq.${userEmail},for_user.eq.${userEmail}`);

    if (!settings.show_completed) {
      query = query.neq("status", "done");
    }

    switch (settings.sort_order) {
      case "due_date":
        query = query
          .order("status", { ascending: false })
          .order("due_date", { ascending: true });
        break;
      case "priority":
        query = query
          .order("status", { ascending: false })
          .order("priority", { ascending: true });
        break;
      default:
        query = query
          .order("status", { ascending: false })
          .order("title", { ascending: true });
    }

    const { data, error } = await query;
    if (error) console.error("Fetch tasks failed:", error.message);
    else setTasks(data as Task[]);
    setLoading(false);
  }, [supabase, userEmail, settings]);

  return { tasks, loading, fetchTasks };
}
