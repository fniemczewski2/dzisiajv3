import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Bus, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import LoadingState from "./LoadingState";

// --- Typy Danych ---
interface Stop {
  id: number;
  name: string;
  symbol: string;
  distance_meters: number;
}

interface Departure {
  trip_id: string;
  line: string;
  direction: string;
  minutes: number;
  delay: number;
  is_realtime: boolean;
}

const getStatusColor = (dep: Departure) => {
  if (!dep.is_realtime) return "text-muted-foreground";
  if (dep.delay > 60) return "text-red-500";
  if (dep.delay < -60) return "text-green-500";
  return "text-blue-500 font-semibold";
};

const formatDepartureTime = (minutes: number) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TransportWidget() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<Stop[]>([]);
  // Zmiana: kluczem w departures jest teraz NAZWA przystanku, a nie ID
  const [departures, setDepartures] = useState<Record<string, Departure[]>>({});
  const [loadingStops, setLoadingStops] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  // 1. Zmiana w fetchPekaTimes - dodajemy logowanie dla debugowania
const fetchPekaTimes = async (stopName: string): Promise<Departure[]> => {
  const { data, error } = await supabase.functions.invoke("get-peka-times", {
    body: { stopName },
  });

  // Logujemy co faktycznie przyszło z PEKA, żeby widzieć przyczynę błędu w konsoli Edge Function
  if (error) throw new Error(`Edge Function Error: ${error.message}`);
  
  // Jeśli PEKA nie znalazła przystanku, success może być pusty lub nie istnieć
  if (!data || !data.success || !data.success.bollardsWithTimes) {
    console.warn(`Brak danych dla przystanku: ${stopName}`);
    return []; // Zwracamy pustą listę zamiast rzucać błędem, by nie psuć UI
  }

  const allTimes: Departure[] = [];
  data.success.bollardsWithTimes.forEach((bt: any) => {
    if (bt.times) {
      bt.times.forEach((t: any) => {
        allTimes.push({
          trip_id: `${t.line}-${t.direction}-${t.departure}-${Math.random()}`,
          line: t.line,
          direction: t.direction,
          minutes: t.minutes,
          delay: 0,
          is_realtime: t.realTime,
        });
      });
    }
  });

  return allTimes
    .sort((a, b) => a.minutes - b.minutes)
    .filter((v, i, a) => 
      a.findIndex(t => t.line === v.line && t.direction === v.direction && t.minutes === v.minutes) === i
    );
};

// 2. Zmiana w fetchData - bezpieczniejsze pętle
const fetchData = useCallback(
  async (lat: number, lng: number) => {
    try {
      const { data: nearbyStops, error: stopsError } = await supabase.rpc(
        "get_nearby_ztm_stops",
        { user_lat: lat, user_lng: lng }
      );

      if (stopsError) throw stopsError;
      if (!nearbyStops || nearbyStops.length === 0) return;

      // Grupowanie nazw (usuwanie duplikatów z bazy)
      const uniqueStops = nearbyStops.reduce((acc: Stop[], current: Stop) => {
        if (!acc.find(item => item.name === current.name)) {
          acc.push(current);
        }
        return acc;
      }, []);

      setStops(uniqueStops);

      // Pobieranie danych - każda nazwa niezależnie
      uniqueStops.forEach(async (stop: Stop) => {
        // Używamy stop.name jako klucza loading, bo po nim grupujemy
        setLoadingStops((prev) => ({ ...prev, [stop.name]: true }));
        
        try {
          const times = await fetchPekaTimes(stop.name);
          setDepartures((prev) => ({ ...prev, [stop.name]: times }));
        } catch (err) {
          // Teraz błąd jednego przystanku tylko loguje ostrzeżenie
          console.error(`Nie udało się pobrać PEKA dla: ${stop.name}`);
        } finally {
          setLoadingStops((prev) => ({ ...prev, [stop.name]: false }));
        }
      });
    } catch (err) {
      console.error("Błąd główny fetchData:", err);
      setError("Problem z bazą przystanków.");
    } finally {
      setLoading(false);
    }
  },
  [supabase]
);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana.");
      setLoading(false);
      return;
    }

    const onWatchSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      lastCoords.current = { lat: latitude, lng: longitude };
      fetchData(latitude, longitude);
    };

    const onWatchError = () => {
      setError("Brak uprawnień do lokalizacji.");
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(onWatchSuccess, onWatchError);

    const refreshInterval = setInterval(() => {
      if (lastCoords.current && open) {
        fetchData(lastCoords.current.lat, lastCoords.current.lng);
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchData, open]);

  if (loading) return <LoadingState />;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all duration-300">
      <div onClick={() => setOpen(!open)} className="bg-card rounded-t-xl shadow overflow-hiddenbg-card sm:my-4 flex justify-between items-center px-3 py-2 sm:p-4 transition cursor-pointer">
        <h3 className="mr-1.5 flex font-semibold items-center">
          <Bus className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
          Transport Poznań
        </h3>

        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {open && (
        <div className="divide-y divide-border animate-in slide-in-from-top-2 duration-300">
          {stops.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">Nie znaleziono przystanków w Twojej okolicy.</div>
          )}
          
          {stops.map((stop) => {
            // Odczytujemy odjazdy po nazwie
            const stopDeps = (departures[stop.name] || []).slice(0, 5); 
            const isInitialLoad = loadingStops[stop.name] && !departures[stop.name];

            return (
              <div key={stop.id} className="p-4 bg-background/50">
                {/* NAGŁÓWEK PRZYSTANKU */}
                <div className="flex justify-between items-start mb-3 min-h-[40px]">
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-md flex items-center gap-1.5">
                      {stop.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                    <MapPin className="w-2.5 h-2.5" />
                    {Math.round(stop.distance_meters)}m
                  </div>
                </div>

                {/* LISTA ODJAZDÓW */}
                <div className="space-y-2 animate-in fade-in duration-500">
                  {isInitialLoad ? (
                    <div className="space-y-3 py-2 animate-pulse">
                      <div className="h-9 bg-muted rounded-lg w-full" />
                      <div className="h-9 bg-muted rounded-lg w-full" />
                      <div className="h-9 bg-muted rounded-lg w-full" />
                    </div>
                  ) : stopDeps.length > 0 ? (
                    stopDeps.map((dep) => (
                      <div key={dep.trip_id} className="flex items-center justify-between group animate-in fade-in duration-500">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-primary font-bold px-2 py-1 rounded-full text-sm min-w-[34px] justify-center border shadow-sm">
                            {dep.line}
                          </span>
                          <span className="text-xs font-semibold truncate max-w-[130px] uppercase tracking-tight text-foreground/80">
                            {dep.direction}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <div className={`text-xs font-bold tabular-nums ${getStatusColor(dep)}`}>
                            {dep.minutes <= 0 ? (
                              <span className="text-blue-600 animate-pulse">TERAZ</span>
                            ) : (
                              `${dep.minutes} min`
                            )}
                          </div>
                          <div className="text-[9px] text-muted-foreground leading-none mt-0.5">
                            {formatDepartureTime(dep.minutes)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-[20px] text-[10px] text-muted-foreground italic rounded-lg">
                      Brak odjazdów w najbliższym czasie
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}