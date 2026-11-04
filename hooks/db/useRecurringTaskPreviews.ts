// hooks/db/useRecurringTaskPreviews.ts
//
// Zadania cykliczne użytkownika (niezależnie od terminu i statusu – zrobione,
// czekające na przesunięcie terminu też) i ich przyszłe wystąpienia w zakresie
// dat. `refreshKey` – zmiana (np. lista zadań po zapisie) pobiera dane ponownie.

import { ownedOrSharedFilter } from "@/lib/postgrestFilters";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import type { Task } from "@/types/tasks";
import { getAppDate } from "@/lib/dateUtils";
import { projectTaskOccurrences } from "@/lib/taskOccurrences";
import { cols } from "@/lib/db/columns";

export function useRecurringTaskPreviews(from: string, to: string, refreshKey?: unknown) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(cols("tasks"))
        .or(ownedOrSharedFilter("user_id", "for_user_id", userId))
        .eq("is_recurring", true);
      if (!cancelled && !error) setTasks((data ?? []) as Task[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, refreshKey]);

  return useMemo(() => projectTaskOccurrences(tasks, from, to, getAppDate()), [tasks, from, to]);
}
