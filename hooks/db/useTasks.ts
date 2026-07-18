import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Task } from "@/types/tasks";
import { useSettings } from "./useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";

const createSortFunction = (sortOrder: string, getPriority: (task: Task) => number) => {
  switch (sortOrder) {
    case "due_date":
      return (a: Task, b: Task) => {
        const pa = getPriority(a), pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        return new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime();
      };
    case "due_date_alphabetical":
      return (a: Task, b: Task) => {
        const pa = getPriority(a), pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        const dd = new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime();
        if (dd !== 0) return dd;
        return (a.title || "").localeCompare(b.title || "", "pl");
      };
    case "priority":
      return (a: Task, b: Task) => {
        const pa = getPriority(a), pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        return (a.priority ?? Infinity) - (b.priority ?? Infinity);
      };
    default:
      return (a: Task, b: Task) => {
        const pa = getPriority(a), pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        return (a.title || "").localeCompare(b.title || "", "pl");
      };
  }
};

const formatDate = (date: string | Date | undefined): string | undefined => {
  if (!date) return undefined;
  if (typeof date === "string") return date;
  return date.toISOString().split("T")[0];
};

const getPriority = (task: Task): number => (task.status === "waiting_for_acceptance" ? 0 : 1);

export function useTasks(dateFrom?: string, dateTo?: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  const userEmailsRef = useRef<Record<string, string>>({});

  const comparator = useMemo(() => {
    if (!settings) return null;
    const sortFn = createSortFunction(settings.sort_order, getPriority);
    return (a: Task, b: Task) => {
      const doneA = a.status === "done" ? 1 : 0;
      const doneB = b.status === "done" ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return sortFn(a, b);
    };
  }, [settings]);

  const tasks = useMemo(() => {
    if (!comparator) return rawTasks;
    return [...rawTasks].sort(comparator);
  }, [rawTasks, comparator]);

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    if (!settings || !userId) return [];
    setFetching(true);
    try {
      const { data, error: queryError } = await withRetry(async () => {
        let query = supabase.from("tasks").select("*").or(`user_id.eq.${userId},for_user_id.eq.${userId}`);
        if (dateFrom) query = query.gte("due_date", dateFrom);
        if (dateTo) query = query.lte("due_date", dateTo);
        if (!settings.show_completed) query = query.neq("status", "done");
        return query;
      });

      if (queryError) throw queryError;

      const fetchedTasks = (data ?? []) as Task[];
      const adaptedTasks = fetchedTasks.map((t) => ({ ...t, shared_with_id: t.for_user_id }));
      const resolvedTasks = await resolveSharedEmails(adaptedTasks, userId, supabase, userEmailsRef);
      const tasksWithDisplayInfo = fetchedTasks.map((task, i) => ({
        ...task,
        display_share_info: resolvedTasks[i].display_share_info,
      }));

      setRawTasks(tasksWithDisplayInfo);
      return tasksWithDisplayInfo;
    } catch {
      toast.error("Błąd pobierania zadań.");
      return [];
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, settings, dateFrom, dateTo, toast, withRetry]);

  const addTask = useCallback(
    async (task: Partial<Task> & { shared_with_email?: string }) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const { shared_with_email: sharedWithEmail, display_share_info: _displayShareInfo, ...taskData } = task;
      const optimisticTask = { ...taskData, id: tempId, user_id: userId } as Task;
      setRawTasks((prev) => [...prev, optimisticTask]);

      try {
        let finalForUserId: string = (taskData as Partial<Task>).for_user_id || userId;
        if (sharedWithEmail !== undefined) {
          const fetchedId = await getUserIdByEmail(sharedWithEmail, supabase);
          if (fetchedId) finalForUserId = fetchedId;
        }

        const { data, error } = await withRetry(async () =>
          supabase
            .from("tasks")
            .insert({
              ...taskData,
              user_id: userId,
              for_user_id: finalForUserId,
              due_date: formatDate((taskData as Partial<Task>).due_date),
            })
            .select()
            .single()
        );
        if (error) throw error;

        setRawTasks((prev) => prev.map((t) => (t.id === tempId ? (data as Task) : t)));
        toast.success("Dodano zadanie");
      } catch {
        setRawTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.error("Błąd dodawania zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry]
  );

  const editTask = useCallback(
    async (task: Task & { shared_with_email?: string }) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = rawTasks;
      setRawTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)));

      try {
        const { shared_with_email: sharedWithEmail, display_share_info: _displayShareInfo, ...taskData } = task;
        let finalForUserId = (taskData as Partial<Task>).for_user_id;

        if (sharedWithEmail !== undefined) {
          const fetchedId = await getUserIdByEmail(sharedWithEmail, supabase);
          finalForUserId = fetchedId || userId;
        }

        const { error } = await withRetry(async () =>
          supabase
            .from("tasks")
            .update({
              ...taskData,
              user_id: userId,
              for_user_id: finalForUserId,
              due_date: formatDate((taskData as Partial<Task>).due_date),
            })
            .eq("id", task.id)
        );
        if (error) throw error;

        toast.success("Zaktualizowano zadanie");
      } catch {
        setRawTasks(previous);
        toast.error("Błąd aktualizacji zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawTasks, toast, withRetry]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć zadanie?`);
      if (!ok) return;
      setLoading(true);
      const previous = rawTasks;
      setRawTasks((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("tasks").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto zadanie");
      } catch {
        setRawTasks(previous);
        toast.error("Błąd usuwania zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawTasks, toast, withRetry]
  );

  const acceptTask = useCallback(
    async (id: string) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const cleanId = id.startsWith("task-") ? id.replace("task-", "") : id;
      const previous = rawTasks;
      setRawTasks((prev) => prev.map((t) => (String(t.id) === cleanId ? { ...t, status: "accepted" } : t)));

      try {
        const { error } = await withRetry(async () =>
          supabase.from("tasks").update({ status: "accepted" }).eq("id", cleanId)
        );
        if (error) throw error;
        toast.success("Zaakceptowano zadanie");
      } catch {
        setRawTasks(previous);
        toast.error("Błąd akceptacji zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawTasks, toast, withRetry]
  );

  const setDoneTask = useCallback(
    async (id: string) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = rawTasks;
      setRawTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done" } : t)));

      try {
        const { error } = await withRetry(async () =>
          supabase.from("tasks").update({ status: "done" }).eq("id", id)
        );
        if (error) throw error;
        toast.success("Wykonano zadanie");
      } catch {
        setRawTasks(previous);
        toast.error("Błąd wykonania zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawTasks, toast, withRetry]
  );

  const rescheduleTask = useCallback(
    async (taskId: string, newDate: string) => {
      if (!userId) {
  
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = rawTasks;
      setRawTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, due_date: newDate } : t)));

      try {
        const { data, error } = await withRetry(async () =>
          supabase.from("tasks").update({ due_date: newDate }).eq("id", taskId).select().single()
        );
        if (error) throw error;
        toast.success("Zmieniono termin zadania");
        return data;
      } catch {
        setRawTasks(previous);
        toast.error("Błąd zmiany terminu zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, rawTasks, toast, withRetry]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    fetching,
    fetchTasks,
    addTask,
    editTask,
    deleteTask,
    acceptTask,
    setDoneTask,
    rescheduleTask,
  };
}
