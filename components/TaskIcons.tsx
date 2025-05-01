// components/TaskIcons.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  Pill,
  Bath,
  Dumbbell,
  Users,
  Briefcase,
  Home,
  Leaf,
  Languages,
} from "lucide-react";

type HabitKey =
  | "pills"
  | "bath"
  | "workout"
  | "friends"
  | "work"
  | "housework"
  | "plants"
  | "duolingo";

const items: { key: HabitKey; Icon: React.ComponentType<any> }[] = [
  { key: "pills", Icon: Pill },
  { key: "bath", Icon: Bath },
  { key: "workout", Icon: Dumbbell },
  { key: "friends", Icon: Users },
  { key: "work", Icon: Briefcase },
  { key: "housework", Icon: Home },
  { key: "plants", Icon: Leaf },
  { key: "duolingo", Icon: Languages },
];

export default function TaskIcons() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";

  // Formatujemy dzisiejszą datę w ISO YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  // Przechowujemy stan nawyków: true = wykonane
  const [done, setDone] = useState<Record<HabitKey, boolean>>({
    pills: false,
    bath: false,
    workout: false,
    friends: false,
    work: false,
    housework: false,
    plants: false,
    duolingo: false,
  });
  const [loading, setLoading] = useState(true);

  // Fetch existing record (jeśli jest) z daily_habits
  const fetchHabits = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_habits")
      .select("*")
      .eq("date", today)
      .eq("user_name", userEmail)
      .maybeSingle();

    if (!error && data) {
      // Ustawiamy stan na wartościach z DB
      const state: Record<HabitKey, boolean> = {
        pills: data.pills,
        bath: data.bath,
        workout: data.workout,
        friends: data.friends,
        work: data.work,
        housework: data.housework,
        plants: data.plants,
        duolingo: data.duolingo,
      };
      setDone(state);
    }
    // Jeśli brak rekordu (error.code === 'PGRST116'), zostajemy z domyślnymi false
    setLoading(false);
  }, [supabase, today, userEmail]);

  useEffect(() => {
    if (userEmail) {
      fetchHabits();
    }
  }, [userEmail, fetchHabits]);

  // Toggle pojedynczego nawyku i zapis do DB (upsert)
  const toggleHabit = async (key: HabitKey) => {
    const newValue = !done[key];
    setDone((prev) => ({ ...prev, [key]: newValue }));

    // Przygotowujemy payload, wypełniając tylko ten klucz na newValue,
    // pozostałe kolumny zostaną domyślnie FALSE albo z poprzedniego zapisu
    const payload: Partial<Record<HabitKey, boolean>> & {
      date: string;
      user_name: string;
    } = {
      date: today,
      user_name: userEmail,
      [key]: newValue,
    };

    await supabase
      .from("daily_habits")
      .upsert(payload, { onConflict: "date,user_name" });
  };

  if (!session) {
    return <div className="py-6 text-center">Ładowanie…</div>;
  }

  return (
    <div className="grid grid-cols-8 gap-2 mb-4">
      {items.map(({ key, Icon }) => (
        <button
          key={key}
          title={key}
          disabled={loading}
          onClick={() => toggleHabit(key)}
          className={`
            p-2 bg-card rounded-xl shadow sm:p-3 border text-center
            ${done[key] ? "bg-green-200" : ""}
            ${loading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 mx-auto" />
        </button>
      ))}
    </div>
  );
}
