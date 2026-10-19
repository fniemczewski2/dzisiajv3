// hooks/db/useTrains.ts

import { useQuery } from "@tanstack/react-query";
import { NotSignedInError } from "@/lib/errors";
import { TRAIN_ACTIVE_WINDOW_MS } from "@/config/timing";
import { useState, useEffect, useCallback } from "react";
import { currentTrainStop, type TrainLiveDetails } from "@/lib/trainPlan";
import { useAuth } from "@/providers/AuthProvider";
import { getAppDateTime } from "@/lib/dateUtils";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/hooks/useRetry";
import { useAbortController } from "@/hooks/useAbortController";
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
  };
}

/** Ile dni wstecz pokazujemy odbyte podróże. */
const PAST_TRAINS_DAYS = 365;
/** Okno „bieżących” pociągów (dla nich pytamy PKP PLK o status). */

function departureTimestamp(train: Pick<TrackedTrain, "date" | "departureTime">): number {
  const [year, month, day] = train.date.split("-").map(Number);
  const [hours, minutes] = train.departureTime.split(":").map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0).getTime();
}

/**
 * Podział na bieżące (±6 h od teraz – z odpytywaniem statusu, jak dotąd)
 * i odbyte (odjazd ponad 6 h temu – bez odpytywania API, najnowsze na górze).
 */
export function splitTrains(
  all: readonly TrackedTrain[],
  nowMs: number
): { active: TrackedTrain[]; past: TrackedTrain[] } {
  const active: TrackedTrain[] = [];
  const past: TrackedTrain[] = [];
  for (const t of all) {
    const ts = departureTimestamp(t);
    if (ts < nowMs - TRAIN_ACTIVE_WINDOW_MS) past.push(t);
    else if (ts <= nowMs + TRAIN_ACTIVE_WINDOW_MS) active.push(t);
  }
  past.sort((a, b) => departureTimestamp(b) - departureTimestamp(a));
  return { active, past };
}

const sortByDepartureAsc = (a: TrackedTrain, b: TrackedTrain): number =>
  a.date !== b.date ? a.date.localeCompare(b.date) : a.departureTime.localeCompare(b.departureTime);

export function useTrains() {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [trains, setTrains] = useState<TrackedTrain[]>([]);
  const [pastTrains, setPastTrains] = useState<TrackedTrain[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(false);
  const { toast } = useToast();
  const withRetry = useRetry();
  const { getSignal } = useAbortController();

  const fetchTrains = useCallback(async () => {
    if (!userId) {
      throw new NotSignedInError();
    }

    const signal = getSignal();
    setFetching(true);
    try {
      const now = getAppDateTime();
      const cutoff = new Date(now.getTime() - PAST_TRAINS_DAYS * 24 * 60 * 60 * 1000);
      const cutoffStr = new Date(cutoff.getTime() - cutoff.getTimezoneOffset() * 60000).toISOString().split("T")[0];

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

      const { active, past } = splitTrains((data || []).map(mapDbRowToTrain), now.getTime());
      setTrains(active);
      setPastTrains(past);
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error("Błąd pobierania pociągów.");
    } finally {
      if (!signal.aborted) setFetching(false);
    }
  }, [userId, supabase, toast, withRetry, getSignal]);

  const addTrain = useCallback(
    async (trainData: TrainInput) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticTrain: TrackedTrain = {
        id: tempId,
        userId,
        trainNumber: trainData.trainNumber,
        trainName: trainData.trainName,
        date: trainData.date,
        departureTime: trainData.departureTime,
        from: trainData.from,
        to: trainData.to,
        wagon: trainData.wagon,
        seat: trainData.seat,
        createdAt: new Date().toISOString(),
      };
      setTrains((prev) => [...prev, optimisticTrain].sort(sortByDepartureAsc));

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

        setTrains((prev) => prev.map((t) => (t.id === tempId ? mapDbRowToTrain(data) : t)).sort(sortByDepartureAsc));
        toast.success("Dodano pociąg");
        return true;
      } catch {
        setTrains((prev) => prev.filter((t) => t.id !== tempId));
        toast.error("Błąd zapisywania pociągu.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const deleteTrain = useCallback(
    async (id: string) => {
      if (!userId) {
        throw new NotSignedInError();
      }
      const ok = await toast.confirm(`Czy chcesz usunąć pociąg?`);
      if (!ok) return;
      setLoading(true);
      const previous = trains;
      const previousPast = pastTrains;
      setTrains((prev) => prev.filter((t) => t.id !== id));
      setPastTrains((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error } = await withRetry(() =>
          supabase.from("user_trains").delete().eq("id", id).eq("user_id", userId)
        );
        if (error) throw error;
        toast.success("Usunięto pociąg");
      } catch {
        setTrains(previous);
        setPastTrains(previousPast);
        toast.error("Błąd usuwania pociągu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, trains, pastTrains, toast, withRetry]
  );

  return {
    trains,
    pastTrains,
    refresh: fetchTrains,
    addTrain,
    deleteTrain,
    fetching,
    loading,
  };
}

/**
 * Bilety na konkretny dzień – do planu dnia. W odróżnieniu od useTrains()
 * nie tnie do okna ±6 h od teraz, bo plan pokazuje cały wybrany dzień.
 */
const NO_TRAINS: TrackedTrain[] = [];

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
    trainNumber: string;
    date: string;
    from: string;
    to: string;
    departureTime: string;
    trainName: string;
  },
  options: TrainStatusOptions = {}
) {
  const { refreshMs = 0, enabled = true } = options;
  const complete = Boolean(train.trainNumber && train.date && train.from && train.to);

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
    enabled: enabled && complete,
    refetchInterval: refreshMs > 0 ? refreshMs : false,
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

  if (query.data) {
    // Błąd kolejnego odświeżenia nie kasuje ostatnich danych – zmienia tylko opis stanu.
    if (query.error && !query.data.status) return { ...query.data, status: errorText(query.error) };
    return query.data;
  }
  if (query.error) return { ...INITIAL_STATUS, status: errorText(query.error), loading: false };
  return { ...INITIAL_STATUS, loading: enabled && complete };
}

/**
 * Status pociągu do planu dnia. Zwraca to samo co useTrainStatus, ale `platform`
 * i `delay` dotyczą stacji wyjazdu do faktycznego odjazdu (z opóźnieniem),
 * a potem stacji przyjazdu. Pełny opis bieżącej stacji jest w `stop`.
 */
export function useTrainPlanStatus(train: Parameters<typeof useTrainStatus>[0], options: TrainStatusOptions = {}) {
  const status = useTrainStatus(train, options);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const stop = currentTrainStop(train, status.live, now);
  return {
    ...status,
    delay: stop.delay,
    platform: status.loading && !stop.platform ? status.platform : (stop.platform ?? "-"),
    stop,
  };
}
