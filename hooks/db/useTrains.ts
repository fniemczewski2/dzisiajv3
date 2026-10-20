// hooks/db/useTrains.ts

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotSignedInError } from "@/lib/errors";
import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useQueryState } from "@/hooks/useQueryState";
import { TRAIN_PLAN_TICK_MS } from "@/config/timing";
import { useNow } from "@/hooks/useNow";
import {
  currentTrainStop,
  isStatusRelevant,
  plannedDeparture,
  trainTimePhase,
  type TrainLiveDetails,
} from "@/lib/trainPlan";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { isAbortError } from "@/lib/abortUtils";
import { TrackedTrain, TrainInput } from "@/types/transport";

function mapDbRowToTrain(row: {
  id: string;
  user_id: string;
  train_number: string;
  train_name: string;
  date: string;
  departure_time: string;
  from_station: string;
  to_station: string;
  wagon: string;
  seat: string;
  created_at: string;
  planned_arrival?: string | null;
}): TrackedTrain {
  return {
    id: row.id,
    userId: row.user_id,
    trainNumber: row.train_number,
    trainName: row.train_name,
    date: row.date,
    departureTime: row.departure_time,
    from: row.from_station,
    to: row.to_station,
    wagon: row.wagon,
    seat: row.seat,
    createdAt: row.created_at,
    plannedArrival: row.planned_arrival ?? null,
  };
}

/** Ile dni wstecz pokazujemy odbyte podróże. */
const PAST_TRAINS_DAYS = 365;

function departureTimestamp(train: Pick<TrackedTrain, "date" | "departureTime">): number {
  return plannedDeparture(train)?.getTime() ?? 0;
}

/**
 * Podział na pociągi bieżące (w oknie odpytywania PKP PLK), nadchodzące (przed oknem)
 * i odbyte (po oknie). Bieżące i nadchodzące rosnąco, odbyte – najnowsze na górze.
 */
export function splitTrains(
  all: readonly TrackedTrain[],
  nowMs: number
): { current: TrackedTrain[]; upcoming: TrackedTrain[]; past: TrackedTrain[] } {
  const now = new Date(nowMs);
  const current: TrackedTrain[] = [];
  const upcoming: TrackedTrain[] = [];
  const past: TrackedTrain[] = [];
  for (const t of all) {
    const phase = trainTimePhase(t, now);
    if (phase === "current") current.push(t);
    else if (phase === "upcoming") upcoming.push(t);
    else past.push(t);
  }
  current.sort(sortByDepartureAsc);
  upcoming.sort(sortByDepartureAsc);
  past.sort((a, b) => departureTimestamp(b) - departureTimestamp(a));
  return { current, upcoming, past };
}

const sortByDepartureAsc = (a: TrackedTrain, b: TrackedTrain): number =>
  a.date !== b.date ? a.date.localeCompare(b.date) : a.departureTime.localeCompare(b.departureTime);

const NO_TRAINS: TrackedTrain[] = [];

export function useTrains() {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const withRetry = useRetry();
  // Podział odświeżany co minutę – pociąg przechodzi z „nadchodzących” do „bieżących” bez przeładowania.
  const now = useNow(60_000);

  const queryTrains = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<TrackedTrain[]> => {
      if (!userId) throw new NotSignedInError();
      try {
        const cutoff = new Date(Date.now() - PAST_TRAINS_DAYS * 24 * 60 * 60 * 1000);
        const cutoffStr = format(cutoff, "yyyy-MM-dd");
        const { data, error } = await withRetry(
          () =>
            supabase
              .from("user_trains")
              .select("*")
              .eq("user_id", userId)
              .gte("date", cutoffStr)
              .order("date", { ascending: true })
              .order("departure_time", { ascending: true })
              .abortSignal(signal),
          signal
        );
        if (error) throw error;
        return (data || []).map(mapDbRowToTrain);
      } catch (err) {
        if (!isAbortError(err)) toast.error("Błąd pobierania pociągów.");
        throw err;
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const {
    data: allTrains,
    setData: setAllTrains,
    fetching,
    refetch,
  } = useQueryState<TrackedTrain[]>({
    queryKey: ["trains", userId ?? null],
    queryFn: queryTrains,
    initial: NO_TRAINS,
    enabled: Boolean(userId),
  });

  const { current, upcoming, past } = useMemo(() => splitTrains(allTrains, now.getTime()), [allTrains, now]);
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const addTrain = useCallback(
    async (trainData: TrainInput) => {
      if (!userId) throw new NotSignedInError();
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticTrain: TrackedTrain = {
        id: tempId,
        userId,
        ...trainData,
        createdAt: new Date().toISOString(),
        plannedArrival: null,
      };
      setAllTrains((prev) => [...prev, optimisticTrain]);

      try {
        const { data, error } = await withRetry(() =>
          supabase
            .from("user_trains")
            .insert([
              {
                user_id: userId,
                train_number: trainData.trainNumber,
                train_name: trainData.trainName,
                date: trainData.date,
                departure_time: trainData.departureTime,
                from_station: trainData.from,
                to_station: trainData.to,
                wagon: trainData.wagon,
                seat: trainData.seat,
              },
            ])
            .select()
            .single()
        );
        if (error) throw error;

        setAllTrains((prev) => prev.map((t) => (t.id === tempId ? mapDbRowToTrain(data) : t)));
        toast.success("Dodano pociąg");
        return true;
      } catch {
        setAllTrains((prev) => prev.filter((t) => t.id !== tempId));
        toast.error("Błąd zapisywania pociągu.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, toast, withRetry, setAllTrains]
  );

  const deleteTrain = useCallback(
    async (id: string) => {
      if (!userId) throw new NotSignedInError();
      const ok = await toast.confirm(`Czy chcesz usunąć pociąg?`);
      if (!ok) return;
      setLoading(true);
      const previous = allTrains;
      setAllTrains((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error } = await withRetry(() =>
          supabase.from("user_trains").delete().eq("id", id).eq("user_id", userId)
        );
        if (error) throw error;
        toast.success("Usunięto pociąg");
      } catch {
        setAllTrains(previous);
        toast.error("Błąd usuwania pociągu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, allTrains, toast, withRetry, setAllTrains]
  );

  return {
    /** W oknie odpytywania PKP PLK (status na żywo). */
    currentTrains: current,
    /** Przed oknem – bez zapytań do PKP PLK. */
    upcomingTrains: upcoming,
    /** Po oknie – bez zapytań do PKP PLK, najnowsze na górze. */
    pastTrains: past,
    refresh,
    addTrain,
    deleteTrain,
    fetching,
    loading,
  };
}

/**
 * Bilety na konkretny dzień – do planu dnia (cały wybrany dzień, bez podziału na okna).
 */

export function useTrainsForDate(dateStr: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  const query = useQuery({
    queryKey: ["trains-for-date", userId ?? null, dateStr],
    enabled: Boolean(userId) && validDate,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from("user_trains")
        .select("*")
        .eq("user_id", userId as string)
        .eq("date", dateStr)
        .order("departure_time", { ascending: true })
        .abortSignal(signal);
      if (error) throw error;
      return (data || []).map(mapDbRowToTrain).sort(sortByDepartureAsc);
    },
  });
  const refetch = query.refetch;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return { trains: userId && validDate && !query.error ? (query.data ?? NO_TRAINS) : NO_TRAINS, refresh };
}

export interface TrainStatusOptions {
  refreshMs?: number;
  enabled?: boolean;
}

interface TrainStatusData {
  delay: number;
  platform: string;
  status: string;
  loading: boolean;
  estimatedArrival: string;
  hide: boolean;
  live: TrainLiveDetails;
}

class TrainStatusError extends Error {}

const INITIAL_STATUS: TrainStatusData = {
  delay: 0,
  platform: "...",
  status: "",
  loading: true,
  estimatedArrival: "",
  hide: false,
  live: {} as TrainLiveDetails,
};

function errorText(error: unknown): string {
  return error instanceof TrainStatusError ? error.message : "Błąd połączenia";
}

export function useTrainStatus(
  train: {
    id?: string;
    trainNumber: string;
    date: string;
    from: string;
    to: string;
    departureTime: string;
    trainName: string;
    plannedArrival?: string | null;
  },
  options: TrainStatusOptions = {}
) {
  const { refreshMs = 0, enabled = true } = options;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const complete = Boolean(train.trainNumber && train.date && train.from && train.to);
  // PKP PLK pytamy wyłącznie w oknie: 3 h przed planowym odjazdem – 3 h po planowym przyjeździe.
  const now = useNow(60_000);
  const inWindow = isStatusRelevant(train, now);
  const active = enabled && complete && inWindow;

  // TanStack Query: ten sam pociąg w kilku miejscach = jedno zapytanie; odświeżanie co
  // `refreshMs` tylko przy widocznej karcie (refetchIntervalInBackground: false).
  const query = useQuery({
    queryKey: [
      "train-status",
      train.trainNumber,
      train.trainName,
      train.date,
      train.from,
      train.to,
      train.departureTime,
    ],
    enabled: active,
    refetchInterval: active && refreshMs > 0 ? refreshMs : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
    queryFn: async ({ signal }): Promise<TrainStatusData> => {
      const params = new URLSearchParams({
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        date: train.date,
        from: train.from,
        to: train.to,
        departureTime: train.departureTime,
      });
      const response = await fetch(`/api/transport/train-status?${params.toString()}`, { signal });
      if (response.status === 429) throw new TrainStatusError("Zbyt wiele zapytań");
      if (!response.ok) throw new TrainStatusError("Błąd połączenia");
      const result = await response.json();
      if (train.id && !train.plannedArrival && typeof result.plannedArrival === "string" && result.plannedArrival) {
        void savePlannedArrival(train.id, result.plannedArrival);
      }
      return {
        delay: result.delay || 0,
        platform: result.platform || "-",
        status: result.status || "",
        loading: false,
        estimatedArrival: result.estimatedArrival || "",
        hide: result.hide || false,
        live: {
          departurePlatform: result.departurePlatform ?? result.platform,
          departureDelay: result.departureDelay ?? (result.status === "W trasie" ? 0 : result.delay),
          actualDeparture: result.actualDeparture,
          departed: result.departed ?? result.status === "W trasie",
          arrivalPlatform: result.arrivalPlatform,
          arrivalDelay: result.arrivalDelay ?? (result.status === "W trasie" ? result.delay : 0),
          plannedArrival: result.plannedArrival,
          actualArrival: result.actualArrival,
          arrivalStation: result.arrivalStation,
        },
      };
    },
  });

  async function savePlannedArrival(id: string, plannedArrival: string) {
    // Zapamiętany przyjazd wyznacza koniec okna odpytywania (także po ponownym uruchomieniu).
    const { error } = await supabase
      .from("user_trains")
      .update({ planned_arrival: plannedArrival })
      .eq("id", id)
      .is("planned_arrival", null);
    if (!error) {
      void queryClient.invalidateQueries({ queryKey: ["trains"] });
      void queryClient.invalidateQueries({ queryKey: ["trains-for-date"] });
    }
  }

  if (!active && !query.data) return { ...INITIAL_STATUS, loading: false };
  if (query.data) {
    // Błąd kolejnego odświeżenia nie kasuje ostatnich danych – zmienia tylko opis stanu.
    if (query.error && !query.data.status) return { ...query.data, status: errorText(query.error) };
    return query.data;
  }
  if (query.error) return { ...INITIAL_STATUS, status: errorText(query.error), loading: false };
  return { ...INITIAL_STATUS, loading: active };
}

/**
 * Status pociągu do planu dnia. Zwraca to samo co useTrainStatus, ale `platform`
 * i `delay` dotyczą stacji wyjazdu do faktycznego odjazdu (z opóźnieniem),
 * a potem stacji przyjazdu. Pełny opis bieżącej stacji jest w `stop`.
 */
export function useTrainPlanStatus(train: Parameters<typeof useTrainStatus>[0], options: TrainStatusOptions = {}) {
  const status = useTrainStatus(train, options);
  const now = useNow(TRAIN_PLAN_TICK_MS);

  const stop = currentTrainStop(train, status.live, now);
  return {
    ...status,
    delay: stop.delay,
    platform: status.loading && !stop.platform ? status.platform : (stop.platform ?? "-"),
    stop,
  };
}
