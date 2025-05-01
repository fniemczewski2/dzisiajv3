import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { HabitRow, WaterRow } from "../types";

export function useCalendarData(
  userEmail: string,
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = useSupabaseClient();
  const [tasksCount, setTasksCount] = useState<Record<string, number>>({});
  const [habitCounts, setHabitCounts] = useState<Record<string, number>>({});
  const [waterCounts, setWaterCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      const [tRes, hRes, wRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("due_date")
          .gte("due_date", rangeStart)
          .lte("due_date", rangeEnd)
          .eq("user_name", userEmail),
        supabase
          .from("daily_habits")
          .select("*")
          .gte("date", rangeStart)
          .lte("date", rangeEnd)
          .eq("user_name", userEmail),
        supabase
          .from("water")
          .select("date,amount")
          .gte("date", rangeStart)
          .lte("date", rangeEnd)
          .eq("user_name", userEmail),
      ]);
      const tMap: Record<string, number> = {};
      tRes.data?.forEach(({ due_date }) => {
        tMap[due_date] = (tMap[due_date] || 0) + 1;
      });
      setTasksCount(tMap);
      const hMap: Record<string, number> = {};
      hRes.data?.forEach((h: HabitRow) => {
        const sum =
          +h.pills +
          +h.bath +
          +h.workout +
          +h.friends +
          +h.work +
          +h.housework +
          +h.plants +
          +h.duolingo;
        hMap[h.date] = sum;
      });
      setHabitCounts(hMap);
      const wMap: Record<string, number> = {};
      wRes.data?.forEach((w: WaterRow) => {
        wMap[w.date] = (wMap[w.date] || 0) + w.amount;
      });
      setWaterCounts(wMap);
    }
    fetchData();
  }, [supabase, userEmail, rangeStart, rangeEnd]);
  return { tasksCount, habitCounts, waterCounts };
}
