"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getAppDateTime } from '@/lib/dateUtils';
import { useToast } from '@/providers/ToastProvider';
import { TrackedTrain, TrainInput } from '@/types/transport';

export function useTrains() {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const [trains, setTrains] = useState<TrackedTrain[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);
  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (loading  && toast.loading) toastId = toast.loading("Ładowanie pociągów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [loading, toast]);

  
  const fetchTrains = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    
    setFetching(true);
    try {
      const now = getAppDateTime();

      const limitPast = now.getTime() - (6 * 60 * 60 * 1000); 
      const limitFuture = now.getTime() + (6 * 60 * 60 * 1000); 

      const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];

      const { data, error } = await supabase
        .from('user_trains')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('departure_time', { ascending: true });

      if (error) throw error;

      const mappedData: TrackedTrain[] = (data || [])
        .map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          trainNumber: item.train_number,
          trainName: item.train_name,
          date: item.date,
          departureTime: item.departure_time,
          from: item.from_station,
          to: item.to_station,
          wagon: item.wagon,
          seat: item.seat,
          createdAt: item.created_at,
        }))
        .filter(train => {
          const [year, month, day] = train.date.split('-').map(Number);
          const [hours, minutes] = train.departureTime.split(':').map(Number);
          
          const departureTime = new Date(year, month - 1, day, hours, minutes);
          const departureTimestamp = departureTime.getTime();

          return departureTimestamp >= limitPast && departureTimestamp <= limitFuture;
        });

      setTrains(mappedData);
    } catch {
      throw new Error("Błąd pobierania pociągów")
    } finally {
      setFetching(false);
    }
  }, [user, supabase, toast]);

  const addTrain = async (trainData: TrainInput) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_trains')
        .insert([{
            user_id: user.id,
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
        .single();

      if (error) throw error;

      const newTrain: TrackedTrain = {
        id: data.id,
        userId: data.user_id,
        trainNumber: data.train_number,
        trainName: data.train_name, 
        date: data.date,
        departureTime: data.departure_time,
        from: data.from_station,
        to: data.to_station,
        wagon: data.wagon,
        seat: data.seat,
        createdAt: data.created_at,
      };

      setTrains((prev) => {
        const updated = [...prev, newTrain];
        return updated.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.departureTime.localeCompare(b.departureTime);
        });
      });

      return true;
    } catch {
      throw new Error('Błąd zapisywania pociągu');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrain = async (id: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const ok = await toast.confirm(
      `Czy chcesz usunąć pociąg?`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_trains')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setTrains((prev) => prev.filter((t) => t.id !== id));
      toast.success("Usunięto pociąg");
    } catch {
      toast.error("Błąd usuwania pociągu");
    } finally {
      setLoading(false);
    }
  };

  return {
    trains,
    refresh: fetchTrains,
    addTrain,
    deleteTrain,
    fetching,
    loading
  };
}

export function useTrainStatus(train: { trainNumber: string; date: string; from: string; to: string; departureTime: string; trainName: string; }) {
  const [data, setData] = useState({ 
      delay: 0, 
      platform: '...', 
      status: '', 
      loading: true, 
      estimatedArrival: '', 
      hide: false 
  });

  useEffect(() => {
      let isMounted = true;
      
      const fetchStatus = async () => {
        if (!train.trainNumber || !train.date || !train.from || !train.to) {
           if (isMounted) setData(prev => ({ ...prev, loading: false }));
           return;
        }

        try {
            const params = new URLSearchParams({
                trainNumber: train.trainNumber,
                trainName: train.trainName,
                date: train.date,
                from: train.from,
                to: train.to, 
                departureTime: train.departureTime
            });

            const response = await fetch(`/api/train-status?${params.toString()}`);
            if (response.status === 429){
              setData({
                delay: 0, 
                platform: '-', 
                status: '429', 
                loading: false,
                estimatedArrival: '',
                hide: false
              })
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
                  hide: result.hide || false
              });
            }
        } catch {
            if (isMounted) setData({ 
                delay: 0, 
                platform: '-', 
                status: 'Błąd połączenia', 
                loading: false,
                estimatedArrival: '',
                hide: false
            });
        }
      };

      fetchStatus();
      
      return () => { isMounted = false; };
  }, [train.trainNumber, train.date, train.from, train.to, train.departureTime, train.trainName]);

  return data;
}