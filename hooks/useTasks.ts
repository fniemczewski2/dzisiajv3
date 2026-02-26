// hooks/useTasks.ts
import { useState, useEffect, useMemo } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Task } from "../types";
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

    default: 
      return (a: Task, b: Task) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority !== bPriority) return aPriority - bPriority;

        return (a.title || "").localeCompare(b.title || "", 'pl');
      };
  }
};

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
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
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

  // POPRAWKA: fetchTasks teraz zwraca pobrane dane bezpośrednio (Promise<Task[]>),
  // zamiast polegać na asynchronicznym stanie 'tasks' wewnątrz bloku finally.
  const fetchTasks = async (): Promise<Task[]> => {
    if (!settings || !userEmail) {
      setError({ message: "Ustawienia lub użytkownik nie są dostępne" });
      return [];
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
        throw queryError;
      }

      const sortedData = data ? [...data] : [];
      
      if (sortFunction) {
        sortedData.sort(sortFunction);
      }

      sortedData.sort((a, b) => {
        const isADone = a.status === "done" ? 1 : 0;
        const isBDone = b.status === "done" ? 1 : 0;
        return isADone - isBDone;
      });

      setTasks(sortedData);
      return sortedData; // Zwracamy świeże dane
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      const taskError = { 
        message: "Nie udało się pobrać zadań. Spróbuj ponownie.", 
        code: err.code 
      };
      setError(taskError);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // POPRAWKA: Dodano bloki try-catch i sprawdzanie błędów z Supabase dla wszystkich mutacji.
  const addTask = async (task: Partial<Task>) => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        ...task,
        user_name: userEmail,
        due_date: formatDate(task.due_date),
      };
      
      const { error: insertError } = await supabase
        .from("tasks")
        .insert(payload);

      if (insertError) throw insertError;

      await fetchTasks();
    } catch (err: any) {
      console.error("Error adding task:", err);
      setError({ message: "Błąd podczas dodawania zadania.", code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const editTask = async (task: Task) => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...task,
        user_name: userEmail,
        due_date: formatDate(task.due_date),
      };
      
      const { error: updateError } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", task.id);

      if (updateError) throw updateError;

      await fetchTasks();
    } catch (err: any) {
      console.error("Error editing task:", err);
      setError({ message: "Błąd podczas edycji zadania.", code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchTasks();
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setError({ message: "Nie udało się usunąć zadania.", code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const acceptTask = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", id);

      if (updateError) throw updateError;
      await fetchTasks();
    } catch (err: any) {
      setError({ message: "Błąd akceptacji zadania.", code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const setDoneTask = async (id: string) => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id);

      if (updateError) throw updateError;
      await fetchTasks();
    } catch (err: any) {
      setError({ message: "Błąd oznaczania zadania jako wykonane.", code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const rescheduleTask = async (taskId: string, newDate: string) => {
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("tasks")
        .update({ due_date: newDate })
        .eq("id", taskId)
        .select()
        .single();

      if (updateError) throw updateError;
      await fetchTasks();
      return data;
    } catch (err: any) {
      console.error("Error rescheduling task:", err);
      setError({ message: "Błąd zmiany terminu zadania.", code: err.code });
      throw err;
    }
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