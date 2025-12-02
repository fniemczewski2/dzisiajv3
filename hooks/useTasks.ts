// hooks/useTasks.ts
import { useState, useEffect, useMemo } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Task, Settings } from "../types";
import { useSettings } from "./useSettings";

interface TaskError {
  message: string;
  code?: string;
}

const createSortFunction = (sortOrder: string, getPriority: (task: Task) => number) => {
  switch (sortOrder) {
    case "due_date":
      return (a: Task, b: Task) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        return (
          new Date(a.due_date ?? 0).getTime() -
          new Date(b.due_date ?? 0).getTime()
        );
      };

    case "due_date_alphabetical":
      return (a: Task, b: Task) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority !== bPriority) return aPriority - bPriority;

        const dateDiff =
          new Date(a.due_date ?? 0).getTime() -
          new Date(b.due_date ?? 0).getTime();
        if (dateDiff !== 0) return dateDiff;

        return (a.title || "").localeCompare(b.title || "", 'pl');
      };

    case "priority":
      return (a: Task, b: Task) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority !== bPriority) return aPriority - bPriority;

        return (a.priority ?? Infinity) - (b.priority ?? Infinity);
      };

    default: // alphabetical
      return (a: Task, b: Task) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority !== bPriority) return aPriority - bPriority;

        return (a.title || "").localeCompare(b.title || "", 'pl');
      };
  }
};

// Helper function to ensure dates are in string format
const formatDate = (date: string | Date | undefined): string | undefined => {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

export function useTasks(
  dateFrom?: string,
  dateTo?: string
) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || "f.niemczewski2@gmail.com";
  const { settings } = useSettings();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TaskError | null>(null);

  const getPriority = (task: Task): number => {
    return task.status === "waiting for acceptance" ? 0 : 1;
  };

  const sortFunction = useMemo(() => {
    if (!settings) return null;
    return createSortFunction(settings.sort_order, getPriority);
  }, [settings?.sort_order]);

  const fetchTasks = async () => {
    if (!settings || !userEmail) {
      setError({ message: "Ustawienia lub użytkownik nie są dostępne" });
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("tasks")
        .select("*")
        .or(`user_name.eq.${userEmail},for_user.eq.${userEmail}`);

      if (dateFrom) {
        query = query.gte("due_date", dateFrom);
      }

      if (dateTo) {
        query = query.lte("due_date", dateTo);
      }

      if (!settings.show_completed) {
        query = query.neq("status", "done");
      }

      const { data, error: queryError } = await query;
      
      if (queryError) {
        console.error("Error fetching tasks:", queryError);
        setError({ 
          message: "Nie udało się pobrać zadań. Spróbuj ponownie.", 
          code: queryError.code 
        });
        setLoading(false);
        return;
      }

      if (!data) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const sortedData = [...data];
      
      if (sortFunction) {
        sortedData.sort(sortFunction);
      }

      sortedData.sort((a, b) => {
        const isADone = a.status === "done" ? 1 : 0;
        const isBDone = b.status === "done" ? 1 : 0;
        return isADone - isBDone;
      });

      setTasks(sortedData);
    } catch (err) {
      console.error("Unexpected error in fetchTasks:", err);
      setError({ 
        message: "Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę." 
      });
    } finally {
      setLoading(false);
      return tasks;
    }
  };

  const addTask = async (task: Task) => {
    if (!userEmail) return;
    setLoading(true);
    
    // Ensure dates are strings, not Date objects
    const payload = {
      ...task,
      user_name: userEmail,
      due_date: formatDate(task.due_date),
      deadline_date: formatDate(task.deadline_date),
    };
    
    await supabase
      .from("tasks")
      .insert(payload)
      .select()
      .single();
    await fetchTasks();
    setLoading(false);
  };

  const editTask = async (task: Task) => {
    if (!userEmail) return;
    setLoading(true);
    // Ensure dates are strings, not Date objects
    const payload = {
      ...task,
      user_name: userEmail,
      due_date: formatDate(task.due_date),
      deadline_date: formatDate(task.deadline_date),
    };
    
    const { data } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", task.id)
      .select()
      .single();
    await fetchTasks();
    setLoading(false);
  };

  const deleteTask = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    await supabase.from("tasks").delete().eq("id", id);
    await fetchTasks();
    setLoading(false);
  };

  const acceptTask = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    await supabase
      .from("tasks")
      .update({ status: "accepted" })
      .eq("id", id);
    await fetchTasks();
    setLoading(false);
  };

  const setDoneTask = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", id);
    await fetchTasks();
    setLoading(false);
  };

  const rescheduleTask = async (taskId: string, newDate: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        due_date: newDate,
        deadline_date: newDate,
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error rescheduling task:", error);
      throw error;
    }

    return data;
  };

  useEffect(() => {
    fetchTasks();
  }, [userEmail, settings?.show_completed, settings?.sort_order, dateFrom, dateTo]);

  return { 
    tasks, 
    loading, 
    error,
    fetchTasks,
    addTask,
    editTask,
    deleteTask,
    acceptTask,
    setDoneTask,
    rescheduleTask
  };
}