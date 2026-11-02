// hooks/db/useHealthData.ts
//
// Dane o zdrowiu ze Skrótów iOS (health_daily, health_workouts). Zapytania tylko przy aktualnej zgodzie –
// bez niej nie pobieramy niczego.

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useHealthConsent } from "@/hooks/useHealthConsent";

export interface HealthDailyRow {
  date: string;
  steps: number | null;
  sleep_minutes: number | null;
  heart_rate_avg: number | null;
  heart_rate_resting: number | null;
}

export interface HealthWorkoutRow {
  id: string;
  activity: string;
  started_at: string;
  duration_minutes: number | null;
  distance_km: number | null;
  energy_kcal: number | null;
  heart_rate_avg: number | null;
}

const DAILY_COLUMNS = "date, steps, sleep_minutes, heart_rate_avg, heart_rate_resting";
const WORKOUT_COLUMNS = "id, activity, started_at, duration_minutes, distance_km, energy_kcal, heart_rate_avg";

export function useHealthDays(from: string, to: string) {
  const { user, supabase } = useAuth();
  const { hasConsent } = useHealthConsent();
  return useQuery({
    queryKey: ["health-daily", user?.id ?? null, from, to],
    enabled: Boolean(user && hasConsent),
    queryFn: async (): Promise<HealthDailyRow[]> => {
      const { data, error } = await supabase
        .from("health_daily")
        .select(DAILY_COLUMNS)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HealthDailyRow[];
    },
  });
}

export function useHealthWorkouts(sinceIso: string) {
  const { user, supabase } = useAuth();
  const { hasConsent } = useHealthConsent();
  return useQuery({
    queryKey: ["health-workouts", user?.id ?? null, sinceIso],
    enabled: Boolean(user && hasConsent),
    queryFn: async (): Promise<HealthWorkoutRow[]> => {
      const { data, error } = await supabase
        .from("health_workouts")
        .select(WORKOUT_COLUMNS)
        .gte("started_at", sinceIso)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HealthWorkoutRow[];
    },
  });
}
