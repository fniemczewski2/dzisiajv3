// hooks/db/useTasks.ts

import { useQueryState } from "@/hooks/useQueryState";
import { ownedOrSharedFilter } from "@/lib/postgrestFilters";
import { NotSignedInError } from "@/lib/errors";
import { OFFLINE_SYNCED_EVENT } from "@/config/storage";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Task } from "@/types/tasks";
import { useSettings } from "./useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { resolveSharedEmails, getUserIdByEmail } from "@/lib/share";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import { useLatestRef } from "@/hooks/useLatestRef";
import { triggerSlackSync } from "@/hooks/db/useSlackTasks";
import { UNDO_WINDOW_MS } from "@/config/timing";
import { enqueueInsert, isOffline } from "@/lib/offlineQueue";

import { omit } from "@/lib/objectUtils";
const createSortFunction = (sortOrder: string, getPriority: (task: Task) => number) => {
  switch (sortOrder) {
    case "due_date":
      return (a: Task, b: Task) => {
        const pa = getPriority(a),
          pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        return new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime();
      };
    case "due_date_alphabetical":
      return (a: Task, b: Task) => {
        const pa = getPriority(a),
          pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        const dd = new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime();
        if (dd !== 0) return dd;
        return (a.title || "").localeCompare(b.title || "", "pl");
      };
    case "priority":
      return (a: Task, b: Task) => {
        const pa = getPriority(a),
          pb = getPriority(b);
        if (pa !== pb) return pa - pb;
        return (a.priority ?? Infinity) - (b.priority ?? Infinity);
      };
    default:
      return (a: Task, b: Task) => {
        const pa = getPriority(a),
          pb = getPriority(b);
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

type TaskInput = Partial<Task> & { shared_with_email?: string };

/**
 * tasks.id to w bazie integer (Supabase zwraca liczbę), a część UI – np. plan
 * dnia – przekazuje go jako tekst. Porównanie `===` liczby z tekstem zawodziło,
 * więc optymistyczne aktualizacje nie trafiały w zadanie.
 */
const sameId = (a: unknown, b: unknown): boolean => String(a) === String(b);

const NO_TASKS: Task[] = [];

export function useTasks(dateFrom?: string, dateTo?: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const sortOrder = settings.sort_order;
  const showCompleted = settings.show_completed;

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  const userEmailsRef = useRef<Record<string, string>>({});
  const rollbackRef = useRef<Task[]>([]);
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());

  const comparator = useMemo(() => {
    const sortFn = createSortFunction(sortOrder, getPriority);
    return (a: Task, b: Task) => {
      const doneA = a.status === "done" ? 1 : 0;
      const doneB = b.status === "done" ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return sortFn(a, b);
    };
  }, [sortOrder]);

  const applyPendingDeletes = useCallback((list: Task[]) => {
    if (pendingDeleteIdsRef.current.size === 0) return list;
    return list.filter((t) => !pendingDeleteIdsRef.current.has(String(t.id)));
  }, []);

  // Pobranie przez TanStack Query (wspólna pamięć dla widoków z tym samym zakresem dat).
  // Bez sieci – ostatnia kopia z IndexedDB.
  const queryTasks = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<Task[]> => {
      if (!userId) return [];
      try {
        const { data, error: queryError } = await withRetry(() => {
          let query = supabase
            .from("tasks")
            .select("*")
            .or(ownedOrSharedFilter("user_id", "for_user_id", userId));
          if (dateFrom) query = query.gte("due_date", dateFrom);
          if (dateTo) query = query.lte("due_date", dateTo);
          if (!showCompleted) query = query.neq("status", "done");
          return query.abortSignal(signal);
        }, signal);

        if (queryError) throw queryError;

        const fetchedTasks = (data ?? []) as Task[];
        const adaptedTasks = fetchedTasks.map((t) => ({ ...t, shared_with_id: t.for_user_id }));
        const resolvedTasks = await resolveSharedEmails(adaptedTasks, userId, supabase, userEmailsRef);
        const tasksWithDisplayInfo = fetchedTasks.map((task, i) => ({
          ...task,
          display_share_info: resolvedTasks[i].display_share_info,
        }));
        const visibleTasks = applyPendingDeletes(tasksWithDisplayInfo);
        return visibleTasks;
      } catch (err) {
        // Bez sieci widok zostaje przy danych z pamięci (także odtworzonych z IndexedDB).
        if (!isAbortError(err)) toast.error("Błąd pobierania zadań.");
        throw err;
      }
    },
    [supabase, userId, showCompleted, dateFrom, dateTo, toast, withRetry, applyPendingDeletes]
  );

  const {
    data: rawTasks,
    setData: setRawTasks,
    fetching,
    refetch: fetchTasks,
  } = useQueryState<Task[]>({
    queryKey: ["tasks", userId ?? null, dateFrom ?? null, dateTo ?? null, showCompleted],
    queryFn: queryTasks,
    initial: NO_TASKS,
    enabled: Boolean(userId),
  });
  const rawTasksRef = useLatestRef(rawTasks);

  const tasks = useMemo(() => {
    return rawTasks.toSorted(comparator);
  }, [rawTasks, comparator]);

  const addTask = useCallback(
    async (task: TaskInput): Promise<Task | undefined> => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const sharedWithEmail = task.shared_with_email;
      const taskData = omit(task, ["shared_with_email", "display_share_info"]);
      const optimisticTask = { ...taskData, id: tempId, user_id: userId } as Task;
      setRawTasks((prev) => [...prev, optimisticTask]);

      try {
        let finalForUserId: string = taskData.for_user_id || userId;
        if (sharedWithEmail !== undefined) {
          const fetchedId = await getUserIdByEmail(sharedWithEmail, supabase);
          if (fetchedId) finalForUserId = fetchedId;
        }

        const { data, error } = await withRetry(() =>
          supabase
            .from("tasks")
            .insert({
              ...taskData,
              user_id: userId,
              for_user_id: finalForUserId,
              due_date: formatDate(taskData.due_date),
            })
            .select()
            .single()
        );
        if (error) throw error;

        setRawTasks((prev) => prev.map((t) => (t.id === tempId ? (data as Task) : t)));
        toast.success("Dodano zadanie");
        triggerSlackSync();
        return data as Task;
      } catch {
        if (isOffline()) {
          const offlinePayload = omit(task, ["shared_with_email", "display_share_info"]);
          await enqueueInsert(userId, "tasks", offlinePayload);
          toast.info("Brak sieci – zadanie zostanie zapisane po odzyskaniu połączenia.");
          return undefined;
        }
        setRawTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.error("Błąd dodawania zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, setRawTasks]
  );

  const editTask = useCallback(
    async (task: Task & { shared_with_email?: string }) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      rollbackRef.current = rawTasksRef.current;
      setRawTasks((prev) => prev.map((t) => (sameId(t.id, task.id) ? { ...t, ...task } : t)));

      try {
        const sharedWithEmail = task.shared_with_email;
        const taskData = omit(task, [
          "shared_with_email",
          "display_share_info",
          "id",
          "user_id",
          "created_at",
          "updated_at",
          "done_at",
        ]);
        let finalForUserId = taskData.for_user_id;

        if (sharedWithEmail !== undefined) {
          const fetchedId = await getUserIdByEmail(sharedWithEmail, supabase);
          finalForUserId = fetchedId || userId;
        }

        const { error } = await withRetry(() =>
          supabase
            .from("tasks")
            .update({
              ...taskData,
              for_user_id: finalForUserId,
              due_date: formatDate(taskData.due_date),
            })
            .eq("id", task.id)
        );
        if (error) throw error;

        toast.success("Zaktualizowano zadanie");
        triggerSlackSync();
      } catch {
        setRawTasks(rollbackRef.current);
        toast.error("Błąd aktualizacji zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, rawTasksRef, setRawTasks]
  );

  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = pendingDeletes.current;
    const pendingIds = pendingDeleteIdsRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      pendingIds.clear();
    };
  }, []);

  const commitDelete = useCallback(
    async (id: string, removed: Task) => {
      const { error } = await withRetry(() => supabase.from("tasks").delete().eq("id", id));
      if (error) {
        pendingDeleteIdsRef.current.delete(String(id));
        setRawTasks((prev) => (prev.some((t) => sameId(t.id, id)) ? prev : [...prev, removed]));
        toast.error("Błąd usuwania zadania.");
        return;
      }
      pendingDeleteIdsRef.current.delete(String(id));
      triggerSlackSync();
    },
    [supabase, withRetry, toast, setRawTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      const snapshot = rawTasksRef.current;

      const ok = await toast.confirm("Czy chcesz usunąć zadanie?");
      if (!ok) return;
      const removed = snapshot.find((t) => sameId(t.id, id));
      if (!removed) return;
      pendingDeleteIdsRef.current.add(String(id));
      setRawTasks((prev) => prev.filter((t) => t.id !== id));

      if (pendingDeletes.current.has(id)) {
        clearTimeout(pendingDeletes.current.get(id));
        pendingDeletes.current.delete(id);
      }

      const timer = setTimeout(() => {
        pendingDeletes.current.delete(id);
        void commitDelete(id, removed);
      }, UNDO_WINDOW_MS);

      pendingDeletes.current.set(id, timer);

      toast.success("Usunięto zadanie", {
        durationMs: UNDO_WINDOW_MS,
        action: {
          label: "Cofnij",
          onClick: () => {
            const pending = pendingDeletes.current.get(id);
            if (pending) {
              clearTimeout(pending);
              pendingDeletes.current.delete(id);
              pendingDeleteIdsRef.current.delete(String(id));

              setRawTasks((prev) => {
                if (prev.some((t) => sameId(t.id, id))) return prev;
                return [...prev, removed];
              });
            }
          },
        },
      });
    },
    [userId, toast, commitDelete, rawTasksRef, setRawTasks]
  );

  const acceptTask = useCallback(
    async (id: string | number) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      const cleanId = String(id).replace(/^task-/, "");
      setLoading(true);
      rollbackRef.current = rawTasksRef.current;
      setRawTasks((prev) => prev.map((t) => (String(t.id) === cleanId ? { ...t, status: "pending" } : t)));

      try {
        const { data, error } = await withRetry(() =>
          supabase
            .from("tasks")
            .update({ status: "pending" })
            .eq("id", cleanId)
            .eq("for_user_id", userId)
            .eq("status", "waiting_for_acceptance")
            .select("id")
        );
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("NO_ROWS_UPDATED");
        toast.success("Zaakceptowano zadanie");
      } catch {
        setRawTasks(rollbackRef.current);
        toast.error("Nie udało się zaakceptować zadania. Odśwież listę i spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, rawTasksRef, setRawTasks]
  );

  /**
   * Oznacza zadanie jako wykonane (`done = true`) albo cofa to oznaczenie.
   * Datę wykonania (done_at) ustawia i czyści trigger w bazie.
   */
  const setDoneTask = useCallback(
    async (id: string, done = true) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      const status = done ? "done" : "pending";
      setLoading(true);
      rollbackRef.current = rawTasksRef.current;
      setRawTasks((prev) => prev.map((t) => (sameId(t.id, id) ? { ...t, status } : t)));

      try {
        const { error } = await withRetry(() => supabase.from("tasks").update({ status }).eq("id", id));
        if (error) throw error;
        toast.success(done ? "Wykonano zadanie" : "Przywrócono zadanie do wykonania");

        // Sync sam sprawdza, czy zadanie jest powiązane z listą Slack.
        triggerSlackSync();
      } catch {
        setRawTasks(rollbackRef.current);
        toast.error(done ? "Błąd wykonania zadania." : "Nie udało się przywrócić zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, rawTasksRef, setRawTasks]
  );

  const rescheduleTask = useCallback(
    async (taskId: string, newDate: string) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      rollbackRef.current = rawTasksRef.current;
      setRawTasks((prev) => prev.map((t) => (sameId(t.id, taskId) ? { ...t, due_date: newDate } : t)));

      try {
        const { data, error } = await withRetry(() =>
          supabase.from("tasks").update({ due_date: newDate }).eq("id", taskId).select().single()
        );
        if (error) throw error;
        toast.success("Zmieniono termin zadania");
        return data;
      } catch {
        setRawTasks(rollbackRef.current);
        toast.error("Błąd zmiany terminu zadania.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId, toast, withRetry, rawTasksRef, setRawTasks]
  );

  // Zapisy wykonane bez sieci zostały wysłane – pobieramy listę z bazy.
  useEffect(() => {
    const onSynced = () => void fetchTasks();
    globalThis.addEventListener(OFFLINE_SYNCED_EVENT, onSynced);
    return () => globalThis.removeEventListener(OFFLINE_SYNCED_EVENT, onSynced);
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
