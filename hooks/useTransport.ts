import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export interface Departure {
  line: string;
  direction: string;
  minutes: number;
  time: string;
  is_realtime: boolean;
  delay: number;
}

export interface StopGroup {
  stop_name: string;
  zone_id: string;
  distance?: number;
  departures: Departure[];
}

export interface SearchResult {
  name: string;
  zone_id: string;
}

export function useTransport(autoRefresh = false) {
  const supabase = useSupabaseClient();

  const [nearbyGroups, setNearbyGroups] = useState<StopGroup[]>([]);
  const [favoritesGroups, setFavoritesGroups] = useState<StopGroup[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  const fetchNearbyData = useCallback(async () => {
    if (!lastCoords.current) {
      console.log("Oczekuję na sygnał GPS, wstrzymuję pobieranie przystanków.");
      setLoadingNearby(false);
      return;
    }

    setLoadingNearby(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("get-transitland-times", {
        body: { 
          lat: lastCoords.current.lat, 
          lon: lastCoords.current.lng 
        },
      });

      if (invokeError) throw new Error("Błąd sieciowy podczas łączenia z funkcją.");

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsedData?.error === "LOCATION_REQUIRED") {
        setLocationError("Lokalizacja jest wymagana, aby pokazać przystanki w pobliżu.");
        setNearbyGroups([]);
      } else if (parsedData?.success) {
        setNearbyGroups(parsedData.success);
        setLocationError(null);
        setError(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Problem z pobieraniem odjazdów w pobliżu.");
    } finally {
      setLoadingNearby(false);
    }
  }, [supabase]);

  const initLocationAndFetch = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Twoja przeglądarka nie obsługuje geolokalizacji.");
      return;
    }

    setLoadingNearby(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastCoords.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        fetchNearbyData();
      },
      (err) => {
        setLoadingNearby(false);
        lastCoords.current = null;
        if (err.code === 1) {
          setLocationError("Brak zgody na lokalizację. Przystanki w pobliżu nie zostaną wyświetlone.");
        } else {
          setLocationError("Nie udało się pobrać Twojej lokalizacji GPS.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchNearbyData]);

  const fetchFavorites = useCallback(async (names: string[]) => {
    if (!names || names.length === 0) {
      setFavoritesGroups([]);
      return;
    }
    setLoadingFavorites(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("get-transitland-times", {
        body: { 
          stopNames: names, 
          lat: lastCoords?.current?.lat, 
          lon: lastCoords?.current?.lng 
        },
      });

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      if (!invokeError && parsedData?.success) {
        setFavoritesGroups(parsedData.success);
      }
    } catch (err: any) {
      console.error("Błąd ładowania ulubionych:", err);
    } finally {
      setLoadingFavorites(false);
    }
  }, [supabase]);

  const searchStops = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (query.length < 3) return [];
    try {
      const { data, error } = await supabase.functions.invoke("get-transitland-times", {
        body: { 
          search: query, 
          lat: lastCoords?.current?.lat, 
          lon: lastCoords?.current?.lng 
        },
      });
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      if (error || !parsedData?.success) return [];
      return parsedData.success;
    } catch (err) {
      console.error("Błąd wyszukiwania:", err);
      return [];
    }
  }, [supabase]);

  useEffect(() => {
    initLocationAndFetch();

    if (autoRefresh) {
      const interval = setInterval(() => {
        if (lastCoords.current) {
          fetchNearbyData();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [initLocationAndFetch, autoRefresh, fetchNearbyData]);

  return {
    nearbyGroups,
    favoritesGroups,
    loadingNearby,
    loadingFavorites,
    error,
    locationError, 
    searchStops,
    fetchFavorites,
    initLocationAndFetch 
  };
}