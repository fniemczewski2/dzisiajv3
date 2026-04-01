import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";
import { useSettings } from "./useSettings";
import { TRANSPORT_API_LIMIT, TRANSPORT_SUGGESTIONS_LIMIT } from "../config/limits";

export interface Departure {
  line: string;
  direction: string;
  minutes: number;
  time: string;
  is_realtime: boolean;
  delay?: number;
}

export interface Bollard {
  bollard_code: string;
  departures: Departure[];
}

export interface StopGroup {
  stop_name: string;
  zone_id: string;
  distance?: number;
  bollards: Bollard[]; 
}

export interface LocalSearchResult {
  name: string;
  zone_id: string;
  displayString: string;
}

export function useTransport(autoRefresh = false) {
  const { supabase } = useAuth();
  const { toast } = useToast();
  const { settings, addFavoriteStop, removeFavoriteStop, loading: settingsLoading } = useSettings();

  const [nearbyGroups, setNearbyGroups] = useState<StopGroup[]>([]);
  const [favoritesGroups, setFavoritesGroups] = useState<StopGroup[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocalSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const lastFetchTime = useRef<Record<string, number>>({});
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
          signal: controller.signal
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
    } catch {
      if (controller.signal.aborted) return;
      setLocationError("Problem z pobieraniem odjazdów w pobliżu.");
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
        setLocationError(
          err.code === 1
            ? "Brak zgody na lokalizację."
            : "Nie udało się pobrać lokalizacji GPS."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchNearbyData]);

  const fetchFavorites = useCallback(async (stops: { name: string; zone_id: string }[]) => {
    if (!stops?.length) {
      setFavoritesGroups([]);
      return;
    }
    const now = Date.now();
    const cacheKey = JSON.stringify(stops);
    if (lastFetchTime.current[cacheKey] && now - lastFetchTime.current[cacheKey] < 5000) return;

    favoritesAbortRef.current?.abort();
    const controller = new AbortController();
    favoritesAbortRef.current = controller;

    setLoadingFavorites(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-transitland-times", {
        body: { stopNames: stops, lat: lastCoords.current?.lat, lon: lastCoords.current?.lng },
        signal: controller.signal
      });
      
      if (error) throw error;
      setFavoritesGroups(data?.success || []);
      lastFetchTime.current[cacheKey] = now;
    } catch {
      toast.error(`Błąd pobierania odjazdów.`);
    } finally {
      setLoadingFavorites(false)
    }
  }, [supabase, toast]);

  const favoriteStops = Array.isArray(settings.favorite_stops) ? settings.favorite_stops : [];
  const favoritesJSON = JSON.stringify(favoriteStops);
  
  useEffect(() => {
    if (settingsLoading) return;
    try {
      const stops = JSON.parse(favoritesJSON);
      fetchFavorites(stops);
    } catch {
      toast.error("Wystąpił błąd pobierania przystanków");
    }
  }, [favoritesJSON, fetchFavorites, settingsLoading, toast]);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSuggestions([]);
        searchResults.length > 0 && setSearchResults([]); 
        return;
      }

      const { data, error } = await supabase
        .from("stops")
        .select("stop_name, zone_id")
        .ilike("stop_name", `%${searchQuery}%`)
        .limit(TRANSPORT_API_LIMIT);

      if (error || !data) {
        console.error("Błąd wyszukiwania przystanków:", error);
        setSuggestions([]);
        setSearchResults([]);
        return;
      }

      const uniqueStops = new Map<string, LocalSearchResult>();

      (data as any[]).forEach((stop) => {
        if (!stop.stop_name) return;

        if (!uniqueStops.has(stop.stop_name)) {
          const isSzczecin = stop.zone_id === "S";
          const cityName = isSzczecin ? "Szczecin" : `Poznań ${stop.zone_id || ""}`;
          const displayString = `${stop.stop_name} (${cityName})`.trim();

          uniqueStops.set(stop.stop_name, {
            name: stop.stop_name,
            zone_id: stop.zone_id || "AUTO",
            displayString: displayString,
          });
        }
      });

      const resultsArray = Array.from(uniqueStops.values()).slice(0, TRANSPORT_SUGGESTIONS_LIMIT);
      setSearchResults(resultsArray);
      setSuggestions(resultsArray.map((r) => r.displayString));
    };

    const debounce = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, supabase, searchResults.length]);

  const handleSuggestionClick = (value: string) => {
    const selectedStop = searchResults.find((s) => s.displayString === value);
    
    if (selectedStop) {
      addFavoriteStop(selectedStop.name, selectedStop.zone_id);
      toast.success(`Dodano do ulubionych: ${selectedStop.name}`);
    } else {
      const fallbackName = value.split(" (")[0];
      addFavoriteStop(fallbackName, "AUTO");
      toast.success(`Dodano do ulubionych: ${fallbackName}`);
    }
    
    setSearchQuery("");
    setSuggestions([]);
    setSearchResults([]);
  };

  useEffect(() => {
      let toastId: string | undefined;
      if (loadingFavorites && favoritesGroups.length === 0) toastId = toast.loading("Ładowanie ulubionych...");
      return () => { if (toastId) toast.dismiss(toastId); };
  }, [loadingFavorites, toast, favoritesGroups.length]);

  useEffect(() => {
      let toastId: string | undefined;
      if (loadingNearby && nearbyGroups.length === 0) toastId = toast.loading("Ładowanie przystanków...");
      return () => { if (toastId) toast.dismiss(toastId); };
  }, [loadingNearby, toast, nearbyGroups.length]);

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
    locationError,
    searchQuery,
    setSearchQuery,
    suggestions,
    handleSuggestionClick,
    initLocationAndFetch,
    favoriteStops,
    addFavoriteStop,
    removeFavoriteStop
  };
}