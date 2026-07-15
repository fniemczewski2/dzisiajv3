"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getAppDateTime } from '@/lib/dateUtils';
import { useToast } from '@/providers/ToastProvider';
import { useRetry } from '@/lib/withRetry';
import { TrackedTrain, TrainInput } from '@/types/transport';

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

  const fetchTrains = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }

    setFetching(true);
    try {
      const now = getAppDateTime();
      const limitPast = now.getTime() - 6 * 60 * 60 * 1000;
      const limitFuture = now.getTime() + 6 * 60 * 60 * 1000;
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      const { data, error } = await withRetry(async () =>
        supabase
          .from('user_trains')
          .select('*')
          .eq('user_id', userId)
          .gte('date', todayStr)
          .order('date', { ascending: true })
          .order('departure_time', { ascending: true })
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
    } catch {
      toast.error("Błąd pobierania pociągów.");
    } finally {
      setFetching(false);
    }
  }, [userId, supabase, toast, withRetry]);

  const addTrain = useCallback(
    async (trainData: TrainInput) => {
      if (!userId) {
        toast.error("Zaloguj się!");
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
        toast.error("Zaloguj się!");
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

export function useTrainStatus(train: {
  trainNumber: string;
  date: string;
  from: string;
  to: string;
  departureTime: string;
  trainName: string;
}) {
  const [data, setData] = useState({
    delay: 0,
    platform: '...',
    status: '',
    loading: true,
    estimatedArrival: '',
    hide: false,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      if (!train.trainNumber || !train.date || !train.from || !train.to) {
        if (isMounted) setData((prev) => ({ ...prev, loading: false }));
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

        const response = await fetch(`/api/transport/train-status?${params.toString()}`);
        if (response.status === 429) {
          if (isMounted) {
            setData({ delay: 0, platform: '-', status: '429', loading: false, estimatedArrival: '', hide: false });
          }
          return;
        }

        if (!response.ok) throw new Error('Błąd pobierania statusu');

        const result = await response.json();
        if (isMounted) {
          setData({
            delay: result.delay || 0,
            platform: result.platform || '-',
            status: result.status || '',
            loading: false,
            estimatedArrival: result.estimatedArrival || '',
            hide: result.hide || false,
          });
        }
      } catch {
        if (isMounted) {
          setData({ delay: 0, platform: '-', status: 'Błąd połączenia', loading: false, estimatedArrival: '', hide: false });
        }
      }
    };

    fetchStatus();
    return () => { isMounted = false; };
  }, [train.trainNumber, train.date, train.from, train.to, train.departureTime, train.trainName]);

  return data;
}