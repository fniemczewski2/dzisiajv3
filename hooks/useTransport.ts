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
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Domyślne koordynaty (np. centrum Warszawy) - użyte tylko jeśli użytkownik odmówi dostępu do GPS
  // const lastCoords = useRef({ lat: 52.2297700, lng: 21.0117800 }); //Warszawa
  const lastCoords = useRef({ lat: 52.4070893, lng: 16.9116794 }); // Poznań
  // const lastCoords = useRef({ lat: 53.4268845, lng: 14.5361154 }); // Szczecin
  // const lastCoords = useRef({ lat: 51.1084492, lng: 17.0405395 }); // Wrocław
  // const lastCoords = useRef({ lat: 52.40728358351517, lng: 16.867937988382558 }); // Poznań Ognik
  const searchStops = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (query.length < 3) return [];
    try {
      const { data, error } = await supabase.functions.invoke("get-transitland-times", {
        // DODANO: Wysyłamy lat i lon, aby serwer wiedział, że jesteśmy w Szczecinie!
        body: { search: query, lat: lastCoords.current.lat, lon: lastCoords.current.lng },
      });
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (error || !parsedData?.success) return [];
      return parsedData.success;
    } catch (err) {
      console.error("Błąd wyszukiwania:", err);
      return [];
    }
  }, [supabase]);

  const fetchFavorites = useCallback(async (names: string[]) => {
    if (!names || names.length === 0) {
      setFavoritesGroups([]);
      return;
    }
    setLoadingFavorites(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("get-transitland-times", {
        // DODANO: Wysyłamy lat i lon dla Ulubionych!
        body: { stopNames: names, lat: lastCoords.current.lat, lon: lastCoords.current.lng },
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

  const fetchNearbyData = useCallback(async (lat: number, lon: number) => {
    setLoadingNearby(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("get-transitland-times", {
        body: { lat, lon },
      });
      if (invokeError) throw new Error("Błąd sieciowy.");
      
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      if (parsedData?.error) throw new Error(parsedData.error);
      
      if (parsedData?.success) {
        setNearbyGroups(parsedData.success);
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
    fetchNearbyData(lastCoords.current.lat, lastCoords.current.lng);
    if (!navigator.geolocation) {
      console.warn("Geolokalizacja nie jest wspierana przez Twoją przeglądarkę.");
      fetchNearbyData(lastCoords.current.lat, lastCoords.current.lng);
      return;
    }

    setLoadingNearby(true); // Ustawiamy loader na czas szukania sygnału GPS

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Zapisujemy prawdziwą lokalizację do referencji
        lastCoords.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        // Pobieramy dane dla nowych koordynatów
        fetchNearbyData(lastCoords.current.lat, lastCoords.current.lng);
      },
      (err) => {
        console.warn("Brak zgody na GPS lub błąd pobierania. Używam lokalizacji domyślnej.", err);
        // Fallback w razie odmowy
        fetchNearbyData(lastCoords.current.lat, lastCoords.current.lng);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchNearbyData]);

  useEffect(() => {
    // Zamiast od razu pobierać dane, najpierw pytamy o GPS
    initLocationAndFetch();

    if (autoRefresh) {
      const interval = setInterval(() => {
        // Tło korzysta ze stale aktualizowanego lastCoords (bez ponownego pytania o zgody GPS)
        fetchNearbyData(lastCoords.current.lat, lastCoords.current.lng);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [initLocationAndFetch, autoRefresh]);

  return {
    nearbyGroups,
    favoritesGroups,
    loadingNearby,
    loadingFavorites,
    error,
    searchStops,
    fetchFavorites,
  };
}