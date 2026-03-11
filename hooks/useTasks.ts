import { useState, useEffect, useMemo } from "react";
import { Task } from "../types";
import { useSettings } from "./useSettings";
import { useAuth } from "../providers/AuthProvider";

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
  const { user, supabase} = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TaskError | null>(null);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const getPriority = (task: Task): number => {
    return task.status === "waiting for acceptance" ? 0 : 1;
  };

  const sortFunction = useMemo(() => {
    if (!settings) return null;
    return createSortFunction(settings.sort_order, getPriority);
  }, [settings?.sort_order]);

  const fetchTasks = async (): Promise<Task[]> => {
    if (!settings || !userId) {
      setError({ message: "Ustawienia lub użytkownik nie są dostępne" });
      return [];
    }
    
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("tasks")
        .select("*")
        .or(`user_id.eq.${userId},for_user_id.eq.${userId}`);

      if (dateFrom) query = query.gte("due_date", dateFrom);
      if (dateTo) query = query.lte("due_date", dateTo);
      if (!settings.show_completed) query = query.neq("status", "done");

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const fetchedTasks = data || [];

      const neededIds = Array.from(new Set(
        fetchedTasks
          .map((t: Task) => t.user_id === userId ? t.for_user_id : t.user_id)
          .filter((id: string) => Boolean(id) && id !== userId && !userEmails[id as string])
      ));

      let currentEmails = { ...userEmails };

      if (neededIds.length > 0) {
        const { data: emailData, error: rpcError } = await supabase
          .rpc('get_emails_by_ids', { user_ids: neededIds });

        if (!rpcError && emailData) {
          const newEmails = (emailData as {id: string, email: string}[]).reduce((acc, curr) => {
            acc[curr.id] = curr.email;
            return acc;
          }, {} as Record<string, string>);
          
          currentEmails = { ...currentEmails, ...newEmails };
          setUserEmails(currentEmails); // Zapis na przyszłość
        }
      }

      const tasksWithDisplayInfo = fetchedTasks.map((task: Task) => {
        const isOwner = task.user_id === userId;
        const targetId = isOwner ? task.for_user_id : task.user_id;
        const email = targetId ? (currentEmails[targetId] || "...") : "";

        return {
          ...task,
          display_share_info: isOwner
            ? (task.for_user_id !== userId ? `Udostępniono: ${email}` : null)
            : `Od: ${email}`
        };
      });

      const sortedData = [...tasksWithDisplayInfo];
      if (sortFunction) sortedData.sort(sortFunction);

      sortedData.sort((a, b) => {
        const isADone = a.status === "done" ? 1 : 0;
        const isBDone = b.status === "done" ? 1 : 0;
        return isADone - isBDone;
      });

      setTasks(sortedData);
      return sortedData;
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError({ message: "Nie udało się pobrać zadań.", code: err.code });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (task: Partial<Task> & { shared_with_email?: string }) => {
    if (!userId) return;
    setLoading(true);

    const { shared_with_email, display_share_info, ...taskData } = task as any;
    let finalForUserId: string = taskData.for_user_id || userId;
    
    try {
      if (shared_with_email && shared_with_email.includes('@')) {
        const { data: foundId, error: rpcError } = await supabase
          .rpc('get_user_id_by_email', { email_address: shared_with_email.trim().toLowerCase() });

        if (!rpcError && foundId) {
          finalForUserId = foundId;
        } else {
          console.warn("Nie znaleziono użytkownika, przypisuję do nadawcy.");
        }
      }

      const payload = {
        ...taskData,
        user_id: userId,        
        for_user_id: finalForUserId, 
        due_date: formatDate(taskData.due_date),
      };

      const { error: insertError } = await supabase.from("tasks").insert(payload);
      if (insertError) throw insertError;

      await fetchTasks();
    } catch (err: any) {
      console.error("Error adding task:", err);
      setError({ message: "Błąd podczas dodawania zadania.", code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const editTask = async (task: Task & { shared_with_email?: string }) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const { shared_with_email, display_share_info, ...taskData } = task as any;
      let finalForUserId = taskData.for_user_id;

      if (shared_with_email !== undefined) {
        if (shared_with_email.includes('@')) {
          const { data: foundId } = await supabase
            .rpc('get_user_id_by_email', { email_address: shared_with_email.trim().toLowerCase() });
          if(foundId) finalForUserId = foundId;
        } else {
          finalForUserId = userId; // Przypisz z powrotem twórcy, gdy e-mail zostanie wyczyszczony (np. "mnie")
        }
      }

      const payload = {
        ...taskData,
        user_id: userId,
        for_user_id: finalForUserId,
        due_date: formatDate(taskData.due_date),
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
    if (!userId) return;
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
    if (!userId) return;
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
    if (!userId) return;
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
  }, [userId, settings?.show_completed, settings?.sort_order, dateFrom, dateTo]);

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