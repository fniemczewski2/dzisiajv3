"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudSnow,
  CloudRain,
  CloudLightning,
  Loader2,
} from "lucide-react";

type ForecastData = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    windspeed_10m: number[];
    uv_index: number[];
    weathercode: number[];
  };
  daily: {
    uv_index_max: number[];
  };
};

type AirData = {
  hourly: {
    time: string[];
    pm10: number[];
    pm2_5: number[];
  };
};

export default function WeatherPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [air, setAir] = useState<AirData | null>(null);

  function WeatherIcon({ code }: { code: number }) {
    if (code <= 1) return <Sun className="w-12 h-12 text-yellow-500" />;
    if (code === 2) return <CloudSun className="w-12 h-12 text-yellow-500" />;
    if (code <= 3) return <Cloud className="w-12 h-12 text-gray-500" />;
    if (code <= 48) return <CloudFog className="w-12 h-12 text-gray-500" />;
    if (code <= 67) return <CloudDrizzle className="w-12 h-12 text-blue-400" />;
    if (code <= 77) return <CloudSnow className="w-12 h-12 text-blue-300" />;
    if (code <= 82) return <CloudRain className="w-12 h-12 text-blue-500" />;
    if (code <= 86) return <CloudSnow className="w-12 h-12 text-blue-300" />;
    return <CloudLightning className="w-12 h-12 text-yellow-600" />;
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;

          const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
          forecastUrl.searchParams.set("latitude", latitude.toString());
          forecastUrl.searchParams.set("longitude", longitude.toString());
          forecastUrl.searchParams.set(
            "hourly",
            "temperature_2m,precipitation,windspeed_10m,uv_index,weathercode"
          );
          forecastUrl.searchParams.set("daily", "uv_index_max");
          forecastUrl.searchParams.set("timezone", "auto");

          const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
          airUrl.searchParams.set("latitude", latitude.toString());
          airUrl.searchParams.set("longitude", longitude.toString());
          airUrl.searchParams.set("hourly", "pm10,pm2_5");
          airUrl.searchParams.set("timezone", "auto");

          const [forecastRes, airRes] = await Promise.all([
            fetch(forecastUrl.toString()),
            fetch(airUrl.toString()),
          ]);

          if (!forecastRes.ok || !airRes.ok) throw new Error();

          const forecastJson = await forecastRes.json();
          const airJson = await airRes.json();

          setForecast(forecastJson);
          setAir(airJson);
        } catch {
          setError("Błąd pobierania danych pogodowych lub jakości powietrza.");
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
        <title>Pogoda – Dzisiaj</title>
      </Head>
      <Layout>
        <div className="flex flex-col">
          <h2 className="text-xl mb-4 font-semibold">Pogoda</h2>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
            </div>
          ) : error ? (
            <p className="text-red-600 text-center">{error}</p>
          ) : forecast && air ? (
            <>
              {/* Ikona i temperatura */}
              <div className="flex flex-col items-center mb-6">
                {(() => {
                  const now = new Date();
                  const currentHour = now.getHours();
                  const index = forecast.hourly.time.findIndex(
                    (t) => new Date(t).getHours() === currentHour
                  );
                  const code = forecast.hourly.weathercode?.[index] ?? null;
                  const temp = forecast.hourly.temperature_2m?.[index] ?? null;

                  return (
                    <>
                      {code !== null && <WeatherIcon code={code} />}
                      {temp !== null && (
                        <div className="text-4xl font-bold mt-2">
                          {temp.toFixed(1)}°C
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Karty: UV, PM10, PM2.5 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl shadow-md flex items-center space-x-3">
                  <Sun className="w-6 h-6 text-yellow-500" />
                  <span className="text-base font-medium">
                    UV max:{" "}
                    <span className="font-semibold">
                      {forecast.daily.uv_index_max?.[0] ?? "-"}
                    </span>
                  </span>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-md flex items-center space-x-3">
                  <Cloud className="w-6 h-6 text-blue-400" />
                  <span className="text-base font-medium">
                    PM10:{" "}
                    <span className="font-semibold">
                      {air.hourly.pm10?.[0] ?? "-"}
                    </span>{" "}
                    µg/m³
                  </span>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-md flex items-center space-x-3">
                  <Cloud className="w-6 h-6 text-blue-300" />
                  <span className="text-base font-medium">
                    PM2.5:{" "}
                    <span className="font-semibold">
                      {air.hourly.pm2_5?.[0] ?? "-"}
                    </span>{" "}
                    µg/m³
                  </span>
                </div>
              </div>

              {/* Tabela godzinowa */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Prognoza godzinowa</h2>
                <div className="overflow-x-auto bg-white rounded-xl shadow-md">
                  <table className="min-w-full text-sm table-auto">
                    <thead className="bg-gray-100 text-gray-700 font-semibold">
                      <tr>
                        <th className="p-2 text-left">Godz</th>
                        <th className="p-2 text-left">Temp.</th>
                        <th className="p-2 text-left">Opady</th>
                        <th className="p-2 text-left">Wiatr</th>
                        <th className="p-2 text-left">UV</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {forecast.hourly.time.slice(0, 24).map((time, i) => (
                        <tr key={time} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                          <td className="px-2 py-2">
                            {new Date(time).toLocaleTimeString("pl-PL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-2 py-2">
                            {forecast.hourly.temperature_2m[i]}°C
                          </td>
                          <td className="px-2 py-2">
                            {forecast.hourly.precipitation[i]} mm
                          </td>
                          <td className="px-2 py-2">
                            {forecast.hourly.windspeed_10m[i]} km/h
                          </td>
                          <td className="px-2 py-2">
                            {forecast.hourly.uv_index[i]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center">Brak danych pogodowych.</p>
          )}
        </div>
      </Layout>
    </>
  );
}
