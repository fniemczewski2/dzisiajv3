import { useEffect, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export interface ScheduleItem {
  time: string;
  label: string;
}

export interface Schema {
  id: string;
  name: string;
  days: number[];
  items: ScheduleItem[];
}

export function useDaySchemas() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchemas = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("day_schemas")
      .select("*")
      .eq("user_name", session.user.email);

    if (!error && data) {
      setSchemas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchemas();
  }, [session]);

  return {
    schemas,
    loading,
    refresh: fetchSchemas, // ✅ add this line
  };
}
