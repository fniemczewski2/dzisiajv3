import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export function useCalendarData(
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const userEmail = session?.user?.email || process.env.USER_EMAIL;
  const [tasksCount, setTasksCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!userEmail) return;
    setLoading(true);

    const { data } = await supabase
      .from("tasks")
      .select("due_date")
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .or(`user_name.eq.${userEmail},for_user.eq.${userEmail}`);

    const tMap: Record<string, number> = {};
    data?.forEach(({ due_date }) => {
      tMap[due_date] = (tMap[due_date] || 0) + 1;
    });
    
    setTasksCount(tMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userEmail, rangeStart, rangeEnd]);

  return { tasksCount, loading, fetchData };
}