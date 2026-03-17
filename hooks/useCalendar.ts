// hooks/useCalendarData.ts
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../providers/AuthProvider";

export function useCalendarData(rangeStart: string, rangeEnd: string) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [tasksCount, setTasksCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("due_date")
        .gte("due_date", rangeStart)
        .lte("due_date", rangeEnd)
        .or(`user_id.eq.${userId},for_user_id.eq.${userId}`);

      if (error) throw error;

      const tMap: Record<string, number> = {};
      (data as { due_date: string }[] | null)?.forEach(({ due_date }) => {
        tMap[due_date] = (tMap[due_date] || 0) + 1;
      });
      setTasksCount(tMap);
    } catch (err) {
      console.error("[useCalendarData] fetchData failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, rangeStart, rangeEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { tasksCount, loading, fetchData };
}