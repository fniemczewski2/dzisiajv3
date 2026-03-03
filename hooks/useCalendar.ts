import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export function useCalendarData(
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userId = session?.user?.id;
  const [tasksCount, setTasksCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);

    const { data } = await supabase
      .from("tasks")
      .select("due_date")
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .or(`user_id.eq.${userId},for_user_id.eq.${userId}`);

    const tMap: Record<string, number> = {};
    data?.forEach(({ due_date }) => {
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