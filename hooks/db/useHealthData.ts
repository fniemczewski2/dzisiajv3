// hooks/db/useHealthData.ts
//
// Dane o zdrowiu (Skróty iOS i wpisy ręczne): dzień (kroki), treningi, rejestr tętna, fazy snu. Zapytania tylko przy
// aktualnej zgodzie; klucze zaczynają się od „health-” – lib/queryPersister nie zapisuje ich w przeglądarce.

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HEALTH_QUERY_MAX_PAGES, HEALTH_QUERY_PAGE_SIZE } from "@/config/limits";
import { useAuth } from "@/providers/AuthProvider";
import { useHealthConsent } from "@/hooks/useHealthConsent";
import { dayBounds } from "@/lib/health/time";
import type { HeartRateRecord, SleepSegment } from "@/lib/health/summary";
import type { ManualWorkoutRow } from "@/lib/health/manualWorkout";

export interface HealthDailyRow {
  date: string;
  steps: number | null;
  sleep_minutes: number | null;
  heart_rate_avg: number | null;
  heart_rate_min: number | null;
  heart_rate_max: number | null;
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
  source: string;
}

const DAILY_COLUMNS = "date, steps, sleep_minutes, heart_rate_avg, heart_rate_min, heart_rate_max, heart_rate_resting";
const WORKOUT_COLUMNS = "id, activity, started_at, duration_minutes, distance_km, energy_kcal, heart_rate_avg, source";

type Page = PromiseLike<{ data: unknown; error: unknown }>;

/** Wszystkie wiersze zapytania stronami (baza zwraca zwykle najwyżej 1000 wierszy na żądanie). */
async function fetchAllPages<T>(load: (from: number, to: number) => Page): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < HEALTH_QUERY_MAX_PAGES; page++) {
    const from = page * HEALTH_QUERY_PAGE_SIZE;
    const { data, error } = await load(from, from + HEALTH_QUERY_PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < HEALTH_QUERY_PAGE_SIZE) break;
  }
  return rows;
}

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
      return (data ?? []) as unknown as HealthDailyRow[];
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
      return (data ?? []) as unknown as HealthWorkoutRow[];
    },
  });
}

/** Pomiary tętna z doby (Europe/Warsaw), od najnowszego. */
export function useHeartRateDay(date: string) {
  const { user, supabase } = useAuth();
  const { hasConsent } = useHealthConsent();
  const bounds = useMemo(() => dayBounds(date), [date]);
  return useQuery({
    queryKey: ["health-heart-rate", user?.id ?? null, date],
    enabled: Boolean(user && hasConsent && bounds),
    queryFn: async (): Promise<HeartRateRecord[]> => {
      if (!bounds) return [];
      return fetchAllPages<HeartRateRecord>((from, to) =>
        supabase
          .from("health_heart_rate")
          .select("recorded_at, bpm")
          .gte("recorded_at", bounds.from)
          .lt("recorded_at", bounds.to)
          .order("recorded_at", { ascending: false })
          .range(from, to)
      );
    },
  });
}

/** Odcinki snu doby (data przebudzenia), chronologicznie. */
export function useSleepNight(date: string) {
  const { user, supabase } = useAuth();
  const { hasConsent } = useHealthConsent();
  return useQuery({
    queryKey: ["health-sleep", user?.id ?? null, date],
    enabled: Boolean(user && hasConsent),
    queryFn: () =>
      fetchAllPages<SleepSegment>((from, to) =>
        supabase
          .from("health_sleep_segments")
          .select("stage, started_at, ended_at")
          .eq("date", date)
          .order("started_at", { ascending: true })
          .range(from, to)
      ),
  });
}

/** Dodawanie i usuwanie treningów (RLS: własne wiersze; dodawanie tylko z ręcznym źródłem i przy zgodzie). */
export function useWorkoutMutations() {
  const { user, supabase } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["health-workouts"] });

  const add = useMutation({
    mutationFn: async (row: ManualWorkoutRow) => {
      if (!user) throw new Error("Brak sesji.");
      const { error } = await supabase.from("health_workouts").insert({ ...row, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Brak sesji.");
      const { error } = await supabase.from("health_workouts").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { addWorkout: add.mutateAsync, removeWorkout: remove.mutateAsync, saving: add.isPending || remove.isPending };
}
