import { useState, useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";

export function useCalendarData(
  rangeStart: string,
  rangeEnd: string
) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [tasksCount, setTasksCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("tasks")
      .select("due_date")
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .or(`user_id.eq.${userId},for_user_id.eq.${userId}`);

    const tMap: Record<string, number> = {};

    (data as { due_date: string }[] | null)?.forEach(({ due_date }) => {
      tMap[due_date] = (tMap[due_date] || 0) + 1;
    });
    
    setTasksCount(tMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId, rangeStart, rangeEnd]);

  return { tasksCount, loading, fetchData };
}