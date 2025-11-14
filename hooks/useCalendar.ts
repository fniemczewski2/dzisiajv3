import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export function useCalendarData(
  userEmail: string,
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = useSupabaseClient();
  const [tasksCount, setTasksCount] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      const [tRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("due_date")
          .gte("due_date", rangeStart)
          .lte("due_date", rangeEnd)
          .or(`user_name.eq.${userEmail},for_user.eq.${userEmail}`),
      ]);
      const tMap: Record<string, number> = {};
      tRes.data?.forEach(({ due_date }) => {
        tMap[due_date] = (tMap[due_date] || 0) + 1;
      });
      setTasksCount(tMap);
    }
    fetchData();
  }, [supabase, userEmail, rangeStart, rangeEnd]);
  return { tasksCount };
}
