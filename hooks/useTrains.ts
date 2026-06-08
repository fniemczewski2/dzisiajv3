"use client";

import { useState, useEffect, useCallback, use } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';

export interface TrainInput {
  trainNumber: string;
  date: string;
  departureTime: string;
  from: string;
  to: string;
  wagon: string;
  seat: string;
}

export interface TrackedTrain extends TrainInput {
  id: string;
  userId: string;
  createdAt: string;
}

export function useTrains() {
  const { supabase, user } = useAuth();
  const { toast } = useToast();
  
  const [trains, setTrains] = useState<TrackedTrain[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTrains = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_trains')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('departure_time', { ascending: true });

      if (error) throw error;

      const mappedData: TrackedTrain[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        trainNumber: item.train_number,
        date: item.date,
        departureTime: item.departure_time,
        from: item.from_station,
        to: item.to_station,
        wagon: item.wagon,
        seat: item.seat,
        createdAt: item.created_at,
      }));

      setTrains(mappedData);
    } catch (err: any) {
      console.error('[Fetch Trains Error]:', err);
      toast.error('Nie udało się pobrać listy pociągów');
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  useEffect(() => {
    if (user) {
      fetchTrains();
    } else {
      setTrains([]);
      setLoading(false);
    }
  }, [user, fetchTrains]);

  // Obsługa powiadomienia o ładowaniu dokładnie tak jak w useTransport.ts
  useEffect(() => {
    let toastId: string | undefined;
    if (loading && trains.length === 0) {
      toastId = toast.loading("Ładowanie zapisanych pociągów...");
    }
    return () => { 
      if (toastId) toast.dismiss(toastId); 
    };
  }, [loading, toast, trains.length]);

  const addTrain = async (trainData: TrainInput) => {
    if (!user) {
      toast.error('Musisz być zalogowany, aby dodać pociąg.');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_trains')
        .insert([{
            user_id: user.id,
            train_number: trainData.trainNumber,
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
    } catch (err: any) {
      console.error('[Add Train Error]:', err);
      toast.error('Wystąpił błąd podczas zapisywania pociągu');
      return false;
    }
  };

  const deleteTrain = async (id: string) => {
    const ok = await toast.confirm('Czy na pewno chcesz przestać śledzić ten pociąg?');
    if (!ok) return false;

    try {
      const { error } = await supabase
        .from('user_trains')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setTrains((prev) => prev.filter((t) => t.id !== id));
      toast.success('Pociąg został usunięty z listy');
      return true;
    } catch (err: any) {
      console.error('[Delete Train Error]:', err);
      toast.error('Nie udało się usunąć pociągu');
      return false;
    }
  };

  const getTrainStatus = (trainNumber: string) => {
    const [data, setData] = useState({ delay: 0, platform: '...', loading: true });

    useEffect(() => {
        let isMounted = true;
        
        const fetchStatus = async () => {
        try {
            const response = await fetch(`/api/train-status?trainNumber=${trainNumber}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            
            if (isMounted) {
            setData({
                delay: result.delay,
                platform: result.platform,
                loading: false
            });
            }
        } catch (error) {
            if (isMounted) setData({ delay: 0, platform: 'Brak', loading: false });
        }
        };

        if (trainNumber) fetchStatus();
        return () => { isMounted = false; };
    }, [trainNumber]);

    return data;
  };

  return {
    trains,
    refresh: fetchTrains,
    addTrain,
    deleteTrain,
    getTrainStatus
  };
}