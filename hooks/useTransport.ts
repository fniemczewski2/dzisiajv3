// hooks/useTransport.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../providers/AuthProvider";

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
  const { supabase } = useAuth();

  const [nearbyGroups, setNearbyGroups] = useState<StopGroup[]>([]);
  const [favoritesGroups, setFavoritesGroups] = useState<StopGroup[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  const nearbyAbortRef    = useRef<AbortController | null>(null);
  const favoritesAbortRef = useRef<AbortController | null>(null);

  const fetchNearbyData = useCallback(async () => {
    if (!lastCoords.current) {
      setLoadingNearby(false);
      return;
    }

    nearbyAbortRef.current?.abort();
    const controller = new AbortController();
    nearbyAbortRef.current = controller;

    setLoadingNearby(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "get-transitland-times",
        {
          body: {
            lat: lastCoords.current.lat,
            lon: lastCoords.current.lng,
          },
        }
      );

      if (controller.signal.aborted) return;

      if (invokeError) throw new Error("Błąd sieciowy podczas łączenia z funkcją.");

      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      if (parsed?.error === "LOCATION_REQUIRED") {
        setLocationError("Lokalizacja jest wymagana, aby pokazać przystanki w pobliżu.");
        setNearbyGroups([]);
      } else if (parsed?.success) {
        setNearbyGroups(parsed.success);
        setLocationError(null);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setLocationError("Problem z pobieraniem odjazdów w pobliżu.");
      console.error("[useTransport] fetchNearbyData:", err);
    } finally {
      if (!controller.signal.aborted) setLoadingNearby(false);
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
        setLocationError(
          err.code === 1
            ? "Brak zgody na lokalizację."
            : "Nie udało się pobrać lokalizacji GPS."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchNearbyData]);

  const fetchFavorites = useCallback(
    async (stops: { name: string; zone_id: string }[]) => {

      if (!stops || stops.length === 0) {
        setFavoritesGroups([]);
        return;
      }

      favoritesAbortRef.current?.abort();
      const controller = new AbortController();
      favoritesAbortRef.current = controller;

      setLoadingFavorites(true);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "get-transitland-times",
          {
            body: {
              stopNames: stops 
            },
          }
        );

        if (controller.signal.aborted) return;
        if (invokeError) throw invokeError;

        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        if (parsed?.success) setFavoritesGroups(parsed.success);
      } catch (err) {
        if (controller.signal.aborted) return;
        throw err;
      } finally {
        if (!controller.signal.aborted) setLoadingFavorites(false);
      }
    },
    [supabase]
  );

  const searchStops = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (query.length < 3) return [];
      try {
        const { data, error } = await supabase.functions.invoke(
          "get-transitland-times",
          {
            body: {
              search: query,
              lat: lastCoords.current?.lat,
              lon: lastCoords.current?.lng,
            },
          }
        );
        if (error) return [];
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        return parsed?.success ?? [];
      } catch (err) {
        console.error("[useTransport] searchStops:", err);
        return [];
      }
    },
    [supabase]
  );

  useEffect(() => {
    initLocationAndFetch();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (autoRefresh) {
      intervalId = setInterval(() => {
        if (lastCoords.current) fetchNearbyData();
      }, 30_000);
    }

    return () => {
      nearbyAbortRef.current?.abort();
      favoritesAbortRef.current?.abort();
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [initLocationAndFetch, autoRefresh, fetchNearbyData]);

  return {
    nearbyGroups,
    favoritesGroups,
    loadingNearby,
    loadingFavorites,
    locationError,
    searchStops,
    fetchFavorites,
    initLocationAndFetch,
  };
}