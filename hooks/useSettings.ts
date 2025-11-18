// hooks/useSettings.ts
import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Settings } from "../types";

export function useSettings() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || "";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("settings")
        .select(
          "sort_order,show_completed,show_habits,show_water_tracker,show_budget_items,show_notifications,users"
        )
        .eq("user_name", userEmail)
        .maybeSingle();

      if (data) {
        setSettings(data);
      } else {
        const defaults = {
          user_name: userEmail,
          sort_order: "priority",
          show_completed: true,
          show_habits: true,
          show_water_tracker: true,
          show_budget_items: true,
          show_notifications: true,
          users: [],
        };
        const { error: insertError } = await supabase
          .from("settings")
          .insert(defaults);

        if (!insertError) {
          setSettings(defaults);
        }
      }
      setLoading(false);
    })();
  }, [userEmail, supabase]);

  return { settings, loading };
}
