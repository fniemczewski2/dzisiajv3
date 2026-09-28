// hooks/db/useTrains.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getAppDateTime } from '@/lib/dateUtils';
import { useToast } from '@/providers/ToastProvider';
import { useRetry } from '@/hooks/useRetry';
import { useAbortController } from '@/hooks/useAbortController';
import { isAbortError } from '@/lib/abortUtils';
import { TrackedTrain, TrainInput } from '@/types/transport';

export function mapDbRowToTrain(row: {
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

const sortByDepartureAsc = (a: TrackedTrain, b: TrackedTrain): number =>
  a.date !== b.date
    ? a.date.localeCompare(b.date)
    : a.departureTime.localeCompare(b.departureTime);

export function useTrains() {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [trains, setTrains] = useState<TrackedTrain[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(false);
  const { toast } = useToast();
  const withRetry = useRetry();
  const { getSignal } = useAbortController();

  const fetchTrains = useCallback(async () => {
    if (!userId) {

      throw new Error("Unauthorized");
    }

    const signal = getSignal();
    setFetching(true);
    try {
      const now = getAppDateTime();
      const limitPast = now.getTime() - 6 * 60 * 60 * 1000;
      const limitFuture = now.getTime() + 6 * 60 * 60 * 1000;
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      const { data, error } = await withRetry(
        async () =>
          supabase
            .from('user_trains')
            .select('*')
            .eq('user_id', userId)
            .gte('date', todayStr)
            .order('date', { ascending: true })
            .order('departure_time', { ascending: true })
            .abortSignal(signal),
        signal
      );

      if (error) throw error;

      const mappedData = (data || [])
        .map(mapDbRowToTrain)
        .filter((train) => {
          const [year, month, day] = train.date.split('-').map(Number);
          const [hours, minutes] = train.departureTime.split(':').map(Number);
          const departureTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();
          return departureTimestamp >= limitPast && departureTimestamp <= limitFuture;
        });

      setTrains(mappedData);
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
  
        throw new Error("Unauthorized");
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
        const { data, error } = await withRetry(async () =>
          supabase
            .from('user_trains')
            .insert([{
              user_id: userId,
              train_number: trainData.trainNumber,
              train_name: trainData.trainName,
              date: trainData.date,
              departure_time: trainData.departureTime,
              from_station: trainData.from,
              to_station: trainData.to,
              wagon: trainData.wagon,
              seat: trainData.seat,
            }])
            .select()
            .single()
        );
        if (error) throw error;

        setTrains((prev) =>
          prev.map((t) => (t.id === tempId ? mapDbRowToTrain(data) : t)).sort(sortByDepartureAsc)
        );
        toast.success("Dodano pociąg");
        return true;
      } catch {
        setTrains((prev) => prev.filter((t) => t.id !== tempId));
        toast.error('Błąd zapisywania pociągu.');
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
  
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć pociąg?`);
      if (!ok) return;
      setLoading(true);
      const previous = trains;
      setTrains((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error } = await withRetry(async () =>
          supabase.from('user_trains').delete().eq('id', id).eq('user_id', userId)
        );
        if (error) throw error;
        toast.success("Usunięto pociąg");
      } catch {
        setTrains(previous);
        toast.error("Błąd usuwania pociągu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, trains, toast, withRetry]
  );

  return {
    trains,
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
export function useTrainsForDate(dateStr: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [trains, setTrains] = useState<TrackedTrain[]>([]);
  const { getSignal } = useAbortController();

  const fetchForDate = useCallback(async () => {
    if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      setTrains([]);
      return;
    }
    const signal = getSignal();
    try {
      const { data, error } = await supabase
        .from('user_trains')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .order('departure_time', { ascending: true })
        .abortSignal(signal);
      if (error) throw error;
      setTrains((data || []).map(mapDbRowToTrain).sort(sortByDepartureAsc));
    } catch (err) {
      if (isAbortError(err)) return;
      // Plan dnia działa dalej bez biletów – nie zasypujemy użytkownika toastami.
      setTrains([]);
    }
  }, [userId, supabase, dateStr, getSignal]);

  useEffect(() => {
    void fetchForDate();
  }, [fetchForDate]);

  return { trains, refresh: fetchForDate };
}

export interface TrainStatusOptions {
  /** Co ile ms odświeżać status (0 = tylko raz). Odświeżanie pauzuje w ukrytej karcie. */
  refreshMs?: number;
  enabled?: boolean;
}

export function useTrainStatus(train: {
  trainNumber: string;
  date: string;
  from: string;
  to: string;
  departureTime: string;
  trainName: string;
}, options: TrainStatusOptions = {}) {
  const { refreshMs = 0, enabled = true } = options;
  const [data, setData] = useState({
    delay: 0,
    platform: '...',
    status: '',
    loading: true,
    estimatedArrival: '',
    hide: false,
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      if (!train.trainNumber || !train.date || !train.from || !train.to) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const params = new URLSearchParams({
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          date: train.date,
          from: train.from,
          to: train.to,
          departureTime: train.departureTime,
        });

        const response = await fetch(`/api/transport/train-status?${params.toString()}`, {
          signal: controller.signal,
        });
        if (response.status === 429) {
          // Karta sprawdza dokładnie ten tekst – wcześniej ustawiane było '429',
          // więc komunikat o limicie nigdy się nie pokazywał.
          setData((prev) => ({ ...prev, status: 'Zbyt wiele zapytań', loading: false }));
          return;
        }

        if (!response.ok) throw new Error('Błąd pobierania statusu');

        const result = await response.json();
        setData({
          delay: result.delay || 0,
          platform: result.platform || '-',
          status: result.status || '',
          loading: false,
          estimatedArrival: result.estimatedArrival || '',
          hide: result.hide || false,
        });
      } catch (err) {
        if (isAbortError(err)) return;
        // Zostawiamy ostatnie znane opóźnienie/peron – przy odświeżaniu chwilowy błąd sieci
        // nie powinien ich kasować.
        setData((prev) => ({ ...prev, status: prev.status && prev.status !== 'Błąd połączenia' ? prev.status : 'Błąd połączenia', loading: false }));
      }
    };

    if (!enabled) {
      setData((prev) => ({ ...prev, loading: false }));
      return () => controller.abort();
    }

    void fetchStatus();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (refreshMs > 0) {
      intervalId = setInterval(() => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') void fetchStatus();
      }, refreshMs);
    }
    return () => {
      controller.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [train.trainNumber, train.date, train.from, train.to, train.departureTime, train.trainName, refreshMs, enabled]);

  return data;
}
