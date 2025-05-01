import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Settings } from "../types";

export function useSettings(userEmail: string) {
  const supabase = useSupabaseClient();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      const { data, error } = await supabase
        .from("settings")
        .select(
          "sort_order,show_completed,show_habits,show_water_tracker,notification_enabled,notification_times"
        )
        .eq("user_name", userEmail)
        .maybeSingle();

      if (error) console.error("Fetch settings failed:", error.message);

      if (data) {
        setSettings(data);
      } else {
        const defaults = {
          user_name: userEmail,
          sort_order: "priority",
          show_completed: true,
          show_habits: true,
          show_water_tracker: true,
          notification_enabled: false,
          notification_times: "06:00,12:00,18:00",
        };
        const { error: insertError } = await supabase
          .from("settings")
          .insert(defaults);
        if (insertError)
          console.error("Insert default settings failed:", insertError.message);
        setSettings(defaults);
      }
      setLoading(false);
    })();
  }, [userEmail, supabase]);

  return { settings, loading };
}
