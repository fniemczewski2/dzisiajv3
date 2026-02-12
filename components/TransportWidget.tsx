import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { BellDot, BusFront, Bus, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import LoadingState from "./LoadingState";

interface Stop {
  id: number;
  name: string;
  symbol: string;
  distance_meters: number;
}

interface Departure {
  line: string;
  direction: string;
  minutes: number;
}

export default function TranspoortWidget() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<Stop[]>([]);
  const [departures, setDepartures] = useState<Record<number, Departure[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const { data: nearbyStops, error: stopsError } = await supabase.rpc(
          "get_nearby_ztm_stops",
          { user_lat: coords.latitude, user_lng: coords.longitude }
        );

        if (stopsError) throw stopsError;
        setStops(nearbyStops);
        const departureResults: Record<number, Departure[]> = {};
        await Promise.all(
          nearbyStops.map(async (stop: Stop) => {
            try {
              const res = await fetch(`/api/ztm?stop_id=${stop.id}`);
              const data = await res.json();
              // Simplify the API response to our interface
              departureResults[stop.id] = data.departures?.slice(0, 3).map((d: any) => ({
                line: d.line,
                direction: d.direction,
                minutes: d.minutes,
              }));
            } catch (err) {
              console.error(`Error fetching departures for stop ${stop.id}`, err);
            }
          })
        );
        setDepartures(departureResults);
      } catch (err) {
        setError("Błąd pobierania odjazdów.");
      } finally {
        setLoading(false);
      }
    });
  }, [supabase]);

  if (loading) return <LoadingState />;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  return (
    <div className="bg-card rounded-xl shadow overflow-hidden">
      <div
        className="flex flex-row shadow items-center justify-between px-3 py-2 sm:p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
      <h3 className="font-semibold flex flex-row items-center">
        <Bus className="w-5 h-5 mr-2" />
          Transport
      </h3>
        {open ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </div>
      {open && (
      <div className="">
        {stops.map((stop) => (
          <div key={stop.id} className="border-b border-gray-100 last:border-0 p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-800">{stop.name}</h3>
              <span className="text-xs text-gray-400">{Math.round(stop.distance_meters)}m</span>
            </div>
            <div className="space-y-2">
              {departures[stop.id]?.length > 0 ? (
                departures[stop.id].map((dep, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-white font-bold px-2 py-0.5 rounded text-xs min-w-[2.5rem] text-center">
                        {dep.line}
                      </span>
                      <span className="text-gray-600 truncate max-w-[150px]">{dep.direction}</span>
                    </div>
                    <span className="font-semibold text-primary">
                      {dep.minutes === 0 ? "<<<" : `${dep.minutes} min`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Brak planowanych odjazdów</p>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}