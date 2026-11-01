// hooks/db/useRecurringTasks.ts
//
// Wzorce zadań cyklicznych (wiersze tasks z is_recurring = true), własne i udostępnione.

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { ownedOrSharedFilter } from "@/lib/postgrestFilters";
import type { Task } from "@/types/tasks";

export const RECURRING_TASKS_KEY = "recurring-tasks";

export function useRecurringTasks() {
  const { user, supabase } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: [RECURRING_TASKS_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(ownedOrSharedFilter("user_id", "for_user_id", userId as string))
        .eq("is_recurring", true)
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}
