// hooks/useAppStreak.ts

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getAppDate } from "@/lib/dateUtils";
import { computeStreak } from "@/lib/appStreak";

const LOOKBACK_DAYS = 400;
let recordedFor: string | null = null;

export function useAppStreak(): number | null {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !supabase) return;
    let cancelled = false;
    const today = getAppDate();

    void (async () => {
      const key = `${userId}:${today}`;
      if (recordedFor !== key) {
        const { error } = await supabase
          .from("app_usage_days")
          .upsert({ user_id: userId, day: today }, { onConflict: "user_id,day", ignoreDuplicates: true });
        if (error) return;
        recordedFor = key;
      }
      const { data, error } = await supabase
        .from("app_usage_days")
        .select("day")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(LOOKBACK_DAYS);
      if (cancelled || error) return;
      setStreak(computeStreak((data ?? []).map((r) => (r as { day: string }).day), today));
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  return streak;
}
