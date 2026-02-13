import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  Bus,
  TramFront,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import LoadingState from "./LoadingState";

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
  route_type: number; // 0 tram, 3 bus
}

export default function TransportWidget() {
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<Stop[]>([]);
  const [departures, setDepartures] = useState<
    Record<number, Departure[]>
  >({});
  const [loadingStops, setLoadingStops] = useState<
    Record<number, boolean>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const getStatusColor = (dep: Departure) => {
    if (!dep.is_realtime) return "text-gray-500";
    
    // Jeśli mamy RT i opóźnienie
    if (dep.delay > 60) return "text-red-500"; // >1min opóźnienia
    if (dep.delay < -60) return "text-green-500"; // >1min wcześniej
    
    return "text-blue-500"; // RT bez znaczącego opóźnienia
  };

  const formatDepartureTime = (minutes: number) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVehicleIcon = (routeType: number) => {
    if (routeType === 0)
      return <TramFront className="w-4 h-4" />;
    return <Bus className="w-4 h-4" />;
  };

  const formatDelay = (delaySeconds: number) => {
    const minutes = Math.round(delaySeconds / 60);
    if (minutes === 0) return null;
    
    if (minutes > 0) {
      return `+${minutes}`;
    }
    return `${minutes}`;
  };

  const fetchData = useCallback(
    async (lat: number, lng: number) => {
      try {
        const { data: nearbyStops, error: stopsError } =
          await supabase.rpc("get_nearby_ztm_stops", {
            user_lat: lat,
            user_lng: lng,
          });

        if (stopsError) throw stopsError;
        if (!nearbyStops || nearbyStops.length === 0) {
          setStops([]);
          setDepartures({});
          return;
        }

        setStops(nearbyStops);

        const departureResults: Record<
          number,
          Departure[]
        > = {};

        const loadingMap: Record<number, boolean> = {};

        await Promise.all(
          nearbyStops.map(async (stop: Stop) => {
            try {
              loadingMap[stop.id] = true;
              setLoadingStops({ ...loadingMap });

              const res = await fetch(
                `/api/ztm?stop_id=${stop.id}`
              );

              if (!res.ok) {
                console.error(`API error for stop ${stop.id}:`, res.status);
                return;
              }

              const data = await res.json();
              
              // Improved debug logging - show RT example if available
              const rtDepartures = data.filter((d: Departure) => d.is_realtime);
              const nonRtDepartures = data.filter((d: Departure) => !d.is_realtime);
              
              console.log(`Stop ${stop.id} (${stop.name}):`, {
                total: data.length,
                withRT: rtDepartures.length,
                withoutRT: nonRtDepartures.length,
                // Show RT example if available, otherwise non-RT
                sample: rtDepartures.length > 0 ? rtDepartures[0] : data[0],
                // Show delays if any
                delays: rtDepartures
                  .filter((d: Departure) => d.delay !== 0)
                  .map((d: Departure) => ({
                    line: d.line,
                    delay_sec: d.delay,
                    delay_min: Math.round(d.delay / 60)
                  }))
              });

              if (Array.isArray(data)) {
                departureResults[stop.id] = data;
              }
            } catch (err) {
              console.error(
                `Stop ${stop.id} error:`,
                err
              );
            } finally {
              loadingMap[stop.id] = false;
              setLoadingStops({ ...loadingMap });
            }
          })
        );

        setDepartures(departureResults);
      } catch (err) {
        console.error(err);
        setError("Błąd pobierania odjazdów.");
      }
    },
    [supabase]
  );

  /* ===========================
     GEO + AUTO REFRESH
  ============================ */

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana.");
      setLoading(false);
      return;
    }

    let interval: NodeJS.Timeout;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await fetchData(
          coords.latitude,
          coords.longitude
        );
        setLoading(false);

        interval = setInterval(() => {
          fetchData(
            coords.latitude,
            coords.longitude
          );
        }, 30000);
      },
      () => {
        setError("Brak dostępu do lokalizacji.");
        setLoading(false);
      }
    );

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData]);

  if (loading) return <LoadingState />;
  if (error)
    return (
      <p className="text-red-500 text-sm">
        {error}
      </p>
    );

  return (
    <div className="bg-card rounded-xl shadow overflow-hidden">
      {/* HEADER */}
      <div
        className="flex items-center justify-between px-3 py-2 sm:p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h3 className="font-semibold flex items-center">
          <Bus className="w-5 h-5 mr-2" />
          Transport
        </h3>

        {open ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </div>

      {/* CONTENT */}
      {open && (
        <div>
          {stops.map((stop) => {
            // Count RT vs non-RT for this stop
            const stopDeps = departures[stop.id] || [];
            const rtCount = stopDeps.filter(d => d.is_realtime).length;
            const totalCount = stopDeps.length;

            return (
              <div
                key={stop.id}
                className="border-b border-gray-100 last:border-0 p-4"
              >
                {/* STOP HEADER */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <h3 className="font-medium text-gray-800">
                      {stop.name}
                    </h3>
                    {/* RT status indicator */}
                    {totalCount > 0 && (
                      <span className="text-xs text-gray-400 mt-0.5">
                        {rtCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-blue-500" />
                            {rtCount}/{totalCount} na żywo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <WifiOff className="w-3 h-3" />
                            Tylko rozkład
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {Math.round(
                      stop.distance_meters
                    )}{" "}
                    m
                  </span>
                </div>

                {/* DEPARTURES */}
                <div className="space-y-2">
                  {loadingStops[stop.id] ? (
                    // Skeleton
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded w-5/7" />
                    </div>
                  ) : departures[stop.id]?.length ? (
                    departures[stop.id]
                    .slice(0, 3)
                    .map(
                      (dep) => (
                        <div
                          key={dep.trip_id}
                          className="flex items-center justify-between text-sm transition-all duration-300 ease-in-out"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center gap-1 bg-primary text-white font-bold px-2 py-0.5 rounded text-xs min-w-[3rem] justify-center">
                              {getVehicleIcon(
                                dep.route_type
                              )}
                              {dep.line}
                            </span>

                            <span className="text-gray-600 truncate max-w-[150px]">
                              {dep.direction}
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              {/* RT Indicator */}
                              {dep.is_realtime ? (
                                <Wifi className="w-3 h-3 text-blue-500" />
                              ) : (
                                <WifiOff className="w-3 h-3 text-gray-300" />
                              )}
                              
                              <span
                                className={`font-semibold transition-colors duration-300 ${getStatusColor(
                                  dep
                                )}`}
                              >
                                {dep.minutes <= 0
                                  ? "Teraz"
                                  : `${dep.minutes} min`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-400">
                                {formatDepartureTime(
                                  dep.minutes
                                )}
                              </span>

                              {/* Pokazuj delay dla RT (zarówno + jak i -) */}
                              {dep.is_realtime && dep.delay !== 0 && (
                                <span 
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    dep.delay > 0 
                                      ? 'bg-red-500 text-white' 
                                      : 'bg-green-500 text-white'
                                  }`}
                                >
                                  {formatDelay(dep.delay)} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Brak planowanych odjazdów
                    </p>
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