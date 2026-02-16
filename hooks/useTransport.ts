import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export interface Stop {
  id: number;
  name: string;
  symbol: string;
  zone_id: string;
  distance_meters?: number;
}

type FavoriteStop = {
  name: string;
  zone_id: string;
};

export interface Departure {
  trip_id: string;
  line: string;
  direction: string;
  minutes: number;
  delay: number;
  is_realtime: boolean;
}

export function useTransport(autoRefresh = false) {
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<Stop[]>([]);
  const [departures, setDepartures] = useState<Record<string, Departure[]>>({});
  const [loadingStops, setLoadingStops] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

 const searchStops = useCallback(
  async (query: string): Promise<FavoriteStop[]> => {
    if (!query) return [];

    const { data, error } = await supabase
      .from("stops")
      .select("stop_name, zone_id")
      .ilike("stop_name", `%${query}%`)
      .limit(10);

    if (error) {
      console.error(error);
      return [];
    }

    const stops =
      data?.map((s) => ({
        name: s.stop_name,
        zone_id: s.zone_id,
      })) || [];

    // usuń duplikaty (name + zone_id)
    return stops.filter(
      (stop, index, self) =>
        index ===
        self.findIndex(
          (s) =>
            s.name === stop.name &&
            s.zone_id === stop.zone_id
        )
    );
  },
  [supabase]
);



  const getStopsByName = useCallback(
    async (name: string): Promise<Stop[]> => {
      const { data, error } = await supabase
        .from("stops")
        .select("stop_id, stop_name, stop_code, zone_id")
        .eq("stop_name", name);

      if (error) {
        console.error(error);
        return [];
      }

      return (
        data?.map((s) => ({
          id: s.stop_id,
          name: s.stop_name,
          symbol: s.stop_code,
          zone_id: s.zone_id,
        })) || []
      );
    },
    [supabase]
  );


    const fetchTimes = useCallback(
    async (
        stop: Pick<Stop, "name" | "zone_id">
    ): Promise<Departure[]> => {
        try {
        const functionName =
            stop.zone_id === "S" ? "get-szczecin-times" : "get-peka-times";

        const body = { stopName: stop.name };

        const { data, error } = await supabase.functions.invoke(functionName, {
            body,
        });

        if (error || !data?.success) return [];

        return data.success
            .map((t: any) => ({
            trip_id: `${t.line}-${t.direction}-${t.minutes}-${Math.random()}`,
            line: t.line,
            direction: t.direction,
            minutes: t.minutes,
            delay: t.delay ?? 0,
            is_realtime: t.is_realtime ?? true,
            }))
            .filter((d: Departure) => d.minutes >= 0)
            .sort((a: Departure, b: Departure) => a.minutes - b.minutes);
        } catch (err) {
        console.error("Transport API error:", err);
        return [];
        }
    },
    [supabase] 
    );


  const fetchNearbyStops = useCallback(
    async (lat: number, lng: number) => {
      try {
        const { data, error } = await supabase.rpc(
          "get_nearby_ztm_stops",
          { user_lat: lat, user_lng: lng }
        );

        if (error) throw error;

        const uniqueStops =
          data?.reduce((acc: Stop[], current: any) => {
            if (!acc.find((item) => item.name === current.name)) {
              acc.push({
                id: current.id,
                name: current.name,
                symbol: current.symbol,
                zone_id: current.zone_id,
                distance_meters: current.distance_meters,
              });
            }
            return acc;
          }, []) || [];

        setStops(uniqueStops);
        
        // fetch departures
        for (const stop of uniqueStops) {
        const key = `${stop.name}_${stop.zone_id}`;
        setLoadingStops((prev) => ({ ...prev, [key]: true }));

        try {
            const times = await fetchTimes(stop);
            setDepartures((prev) => ({ ...prev, [key]: times }));
        } catch (err) {
            console.error(`Times error for ${key}`, err);
        } finally {
            setLoadingStops((prev) => ({ ...prev, [key]: false }));
        }
        }
      } catch {
        setError("Problem z bazą przystanków.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, fetchTimes]
  );

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,   
        };

        lastCoords.current = coords;
        fetchNearbyStops(coords.lat, coords.lng);
      },
      () => setError("Brak uprawnień do lokalizacji")
    );

    if (autoRefresh) {
      const interval = setInterval(() => {
        if (lastCoords.current) {
          fetchNearbyStops(
            lastCoords.current.lat,
            lastCoords.current.lng
          );
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [fetchNearbyStops, autoRefresh]);

  const fetchMultipleStops = useCallback(
  async (stopsList: { name: string; zone_id: string }[]) => {
    for (const stop of stopsList) {
      const key = `${stop.name}_${stop.zone_id}`;

      setLoadingStops((prev) => ({ ...prev, [key]: true }));

      try {
        const times = await fetchTimes(stop);

        setDepartures((prev) => ({
          ...prev,
          [key]: times,
        }));
      } finally {
        setLoadingStops((prev) => ({ ...prev, [key]: false }));
      }
    }
  },
  [fetchTimes]
);


  return {
    stops,
    departures,
    loadingStops,
    loading,
    error,
    fetchTimes,
    searchStops,
    getStopsByName,
    fetchMultipleStops
  };
}
