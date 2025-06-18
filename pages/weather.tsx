// pages/weather.tsx
"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import {
  Loader2,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Radiation,
  Cloud,
} from "lucide-react";

export default function WeatherPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = new URL("https://api.open-meteo.com/v1/forecast");
          url.searchParams.set("latitude", coords.latitude.toString());
          url.searchParams.set("longitude", coords.longitude.toString());
          url.searchParams.set(
            "hourly",
            [
              "temperature_2m",
              "precipitation",
              "windspeed_10m",
              "uv_index",
            ].join(",")
          );
          url.searchParams.set(
            "daily",
            ["uv_index_max", "pm10", "pm2_5"].join(",")
          );
          url.searchParams.set("timezone", "auto");

          const res = await fetch(url.toString());
          const json = await res.json();

          setData(json);
        } catch (err) {
          setError("Błąd pobierania danych pogodowych.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Nie można uzyskać lokalizacji.");
        setLoading(false);
      }
    );
  }, []);

  return (
    <>
      <Head>
        <title>Pogoda – Dzisiaj v3</title>
      </Head>
      <main>
        <h2 className="text-2xl font-semibold mb-4">Szczegółowa prognoza</h2>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-700">
              <div className="bg-card p-4 rounded-xl shadow flex items-center space-x-2">
                <Radiation className="w-6 h-6" />
                <span>UV max: {data.daily.uv_index_max[0]}</span>
              </div>
              <div className="bg-card p-4 rounded-xl shadow flex items-center space-x-2">
                <Cloud className="w-6 h-6" />
                <span>PM10: {data.daily.pm10[0]} µg/m³</span>
              </div>
              <div className="bg-card p-4 rounded-xl shadow flex items-center space-x-2">
                <Cloud className="w-6 h-6" />
                <span>PM2.5: {data.daily.pm2_5[0]} µg/m³</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Prognoza godzinowa</h3>
              <div className="overflow-x-auto bg-card rounded-xl shadow p-4">
                <table className="text-sm min-w-max w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-1 pr-4">Godzina</th>
                      <th className="py-1 pr-4">Temp.</th>
                      <th className="py-1 pr-4">Opady</th>
                      <th className="py-1 pr-4">Wiatr</th>
                      <th className="py-1 pr-4">UV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hourly.time
                      .slice(0, 24)
                      .map((time: string, i: number) => (
                        <tr key={time} className="border-b last:border-b-0">
                          <td className="py-1 pr-4">
                            {new Date(time).getHours()}:00
                          </td>
                          <td className="py-1 pr-4">
                            {data.hourly.temperature_2m[i]}°C
                          </td>
                          <td className="py-1 pr-4">
                            {data.hourly.precipitation[i]} mm
                          </td>
                          <td className="py-1 pr-4">
                            {data.hourly.windspeed_10m[i]} km/h
                          </td>
                          <td className="py-1 pr-4">
                            {data.hourly.uv_index[i]}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p>Brak danych pogodowych.</p>
        )}
      </main>
    </>
  );
}
