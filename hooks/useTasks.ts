import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Task } from "../types";
import { useSettings } from "./useSettings";
import { useAuth } from "../providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "../utils/share";

const createSortFunction = (
  sortOrder: string,
  getPriority: (task: Task) => number
) => {
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

export function useTasks(dateFrom?: string, dateTo?: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();

  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmailsRef = useRef<Record<string, string>>({});

  const getPriority = (task: Task): number =>
    task.status === "waiting for acceptance" ? 0 : 1;

  const sortFunction = useMemo(() => {
    if (!settings) return null;
    return createSortFunction(settings.sort_order, getPriority);
  }, [settings?.sort_order]);

  const tasks = useMemo(() => {
    if (!settings) return rawTasks;
    const sorted = [...rawTasks];
    if (sortFunction) sorted.sort(sortFunction);
    return sorted.sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0));
  }, [rawTasks, settings, sortFunction]);

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    if (!settings || !userId) return [];

    setFetching(true);
    try {
      let query = supabase
        .from("tasks")
        .select("*")
        .or(`user_id.eq.${userId},for_user_id.eq.${userId}`);

      if (dateFrom) query = query.gte("due_date", dateFrom);
      if (dateTo)   query = query.lte("due_date", dateTo);
      if (!settings.show_completed) query = query.neq("status", "done");

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const fetchedTasks = (data ?? []) as Task[];
      const adaptedTasks = fetchedTasks.map(t => ({ ...t, shared_with_id: t.for_user_id }));
      const resolvedTasks = await resolveSharedEmails(adaptedTasks, userId, supabase, userEmailsRef);
      const tasksWithDisplayInfo = fetchedTasks.map((task, i) => ({
        ...task,
        display_share_info: resolvedTasks[i].display_share_info
      }));

      setRawTasks(tasksWithDisplayInfo);
      return tasksWithDisplayInfo;
    } finally {
      setFetching(false);
    }
  }, [
    supabase, userId,
    settings?.show_completed,
    dateFrom, dateTo,
  ]);

  const addTask = useCallback(
    async (task: Partial<Task> & { shared_with_email?: string }) => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { shared_with_email, display_share_info, ...taskData } =
          task as Task & { shared_with_email?: string };
        
        let finalForUserId: string = (taskData as any).for_user_id || userId;

        if (shared_with_email !== undefined) {
          const fetchedId = await getUserIdByEmail(shared_with_email, supabase);
          if (fetchedId) finalForUserId = fetchedId;
        }

        const { error: insertError } = await supabase.from("tasks").insert({
          ...taskData,
          user_id: userId,
          for_user_id: finalForUserId,
          due_date: formatDate((taskData as any).due_date),
        });
        if (insertError) throw insertError;
        await fetchTasks();
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, fetchTasks]
  );

  const editTask = useCallback(
    async (task: Task & { shared_with_email?: string }) => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { shared_with_email, display_share_info, ...taskData } =
          task as Task & { shared_with_email?: string };
        
        let finalForUserId = (taskData as any).for_user_id;

        if (shared_with_email !== undefined) {
          const fetchedId = await getUserIdByEmail(shared_with_email, supabase);
          finalForUserId = fetchedId || userId; 
        }

        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            ...taskData,
            user_id: userId,
            for_user_id: finalForUserId,
            due_date: formatDate((taskData as any).due_date),
          })
          .eq("id", task.id);
        if (updateError) throw updateError;
        await fetchTasks();
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, fetchTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
        if (deleteError) throw deleteError;
        await fetchTasks();
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, fetchTasks]
  );

  const acceptTask = useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ status: "accepted" })
          .eq("id", id);
        if (updateError) throw updateError;
        await fetchTasks();
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, fetchTasks]
  );

  const setDoneTask = useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Musisz być zalogowany");
      setLoading(true);
      try {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ status: "done" })
          .eq("id", id);
        if (updateError) throw updateError;
        await fetchTasks();
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, fetchTasks]
  );

  const rescheduleTask = useCallback(
    async (taskId: string, newDate: string) => {
      const { data, error: updateError } = await supabase
        .from("tasks")
        .update({ due_date: newDate })
        .eq("id", taskId)
        .select()
        .single();
      if (updateError) throw updateError;
      await fetchTasks();
      return data;
    },
    [supabase, fetchTasks]
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