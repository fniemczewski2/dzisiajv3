import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import Layout from "../components/Layout";

interface Stop {
  id: string;
  name: string;
  distance_meters: number;
}

interface Departure {
  line: string;
  direction: string;
  minutes: number;
}

export default function TransportPage() {
  const supabase = useSupabaseClient();

  const [stops, setStops] = useState<Stop[]>([]);
  const [departures, setDepartures] = useState<
    Record<string, Departure[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ===============================
     POBIERANIE NAJBLIŻSZYCH PRZYSTANKÓW
  =============================== */

  const loadStops = async () => {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { data, error } = await supabase.rpc(
            "get_nearby_ztm_stops",
            {
              user_lat: coords.latitude,
              user_lng: coords.longitude,
            }
          );

          if (error) throw error;

          setStops(data || []);
          await loadDepartures(data || []);
        } catch (err) {
          console.error(err);
          setError("Błąd pobierania przystanków.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Brak dostępu do lokalizacji.");
        setLoading(false);
      }
    );
  };

  /* ===============================
     POBIERANIE ODJAZDÓW
  =============================== */

  const loadDepartures = async (stopsList: Stop[]) => {
    const results: Record<string, Departure[]> = {};

    await Promise.all(
      stopsList.map(async (stop) => {
        try {
          const res = await fetch(`/api/ztm?stop_id=${stop.id}&debug=true`);
          if (!res.ok) return;

          const data = await res.json();
          if (Array.isArray(data)) {
            results[stop.id] = data;
          }
        } catch (err) {
          console.error("Stop error:", err);
        }
      })
    );

    setDepartures(results);
  };

  /* ===============================
     RĘCZNA AKTUALIZACJA GTFS
  =============================== */

  const handleManualSync = async () => {
    setSyncing(true);

    try {
      const res = await fetch("/api/gtfs-sync", {
        method: "POST"
      });

      if (!res.ok) throw new Error("Sync failed");

      alert("Aktualizacja zakończona sukcesem.");
    } catch (err) {
      alert("Błąd aktualizacji.");
        console.error("MANUAL SYNC ERROR:", err);
    } finally {
      setSyncing(false);
    }
  };
  useEffect(() => {
    loadStops();
  }, []);
    useEffect(() => {
        if (!stops.length) return;

        const interval = setInterval(() => {
            loadDepartures(stops);
        }, 30000);

        return () => clearInterval(interval);
    }, [stops]);


  if (loading) return <p className="p-6">Ładowanie...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <Layout>
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Najbliższe odjazdy</h1>

        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {syncing ? "Aktualizuję..." : "Ręczna aktualizacja"}
        </button>
      </div>

      {stops.map((stop) => (
        <div
          key={stop.id}
          className="mb-6 border rounded-lg p-4 shadow-sm"
        >
          <div className="flex justify-between mb-2">
            <h2 className="font-semibold">{stop.name}</h2>
            <span className="text-sm text-gray-500">
              {Math.round(stop.distance_meters)} m
            </span>
          </div>

          {departures[stop.id]?.length ? (
            departures[stop.id].map((dep, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm py-1"
              >
                <div className="flex gap-2">
                  <span className="bg-black text-white px-2 rounded text-xs">
                    {dep.line}
                  </span>
                  <span className="text-gray-600 truncate max-w-[180px]">
                    {dep.direction}
                  </span>
                </div>

                <span className="font-semibold">
                  {dep.minutes === 0
                    ? "<<<"
                    : `${dep.minutes} min`}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">
              Brak planowanych odjazdów
            </p>
          )}
        </div>
      ))}
    </div>
    </Layout>
  );
}
