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
  Gauge,
  Droplet,
  ThermometerSnowflake,
  ThermometerSun,
  Wind,
  Sunrise,
  Sunset,
} from "lucide-react";
import { getAppDateTime } from "../lib/dateUtils";

function WeatherIcon({ code }: { code: number }) {
  if (code <= 1) return <Sun className="w-10 h-10 text-yellow-500" />;
  if (code === 2) return <CloudSun className="w-10 h-10 text-yellow-500" />;
  if (code <= 3) return <Cloud className="w-10 h-10 text-gray-500" />;
  if (code <= 48) return <CloudFog className="w-10 h-10 text-gray-500" />;
  if (code <= 67) return <CloudDrizzle className="w-10 h-10 text-blue-400" />;
  if (code <= 77) return <CloudSnow className="w-10 h-10 text-blue-300" />;
  if (code <= 82) return <CloudRain className="w-10 h-10 text-blue-500" />;
  if (code <= 86) return <CloudSnow className="w-10 h-10 text-blue-300" />;
  return <CloudLightning className="w-10 h-10 text-yellow-600" />;
}

function airQualityColor(value: number): string {
  if (value <= 20) return "text-green-600";
  if (value <= 35) return "text-green-400";
  if (value <= 50) return "text-yellow-500";
  if (value <= 100) return "text-orange-500";
  return "text-red-600";
}

function evaluateBiomet(forecast: any) {
  const t = forecast?.hourly.temperature_2m?.[0];
  const p = forecast?.hourly.pressure_msl?.[0];
  const h = forecast?.hourly.relative_humidity_2m?.[0];
  const w = forecast?.hourly.windspeed_10m?.[0];

  if (t == null || p == null || h == null || w == null) {
    return { label: "Brak danych", color: "text-gray-400" };
  }

  let score = 100;

  if (t < 18) score -= (18 - t) * 2; 
  if (t > 24) score -= (t - 24) * 2;

  if (w > 10) score -= (w - 10) * 1.5;

  if (h < 40) score -= (40 - h) * 0.5;
  if (h > 60) score -= (h - 60) * 0.5;

  if (p < 1010) score -= (1010 - p) * 0.8;
  if (p > 1025) score -= (p - 1025) * 0.8;

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  if (score >= 75) return { label: "Korzystny", color: "text-green-600" };
  if (score >= 50) return { label: "Umiarkowany", color: "text-yellow-600" };
  return { label: "Niekorzystny", color: "text-red-600" };
}


export default function WeatherPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [air, setAir] = useState<any>(null);

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
            "temperature_2m,precipitation,windspeed_10m,uv_index,weathercode,pressure_msl,relative_humidity_2m,winddirection_10m"
          );
          forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weathercode,uv_index_max,sunrise,sunset,precipitation_sum");
          forecastUrl.searchParams.set("timezone", "auto");
          forecastUrl.searchParams.set("forecast_days", "6");

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
        <h2 className="text-xl mb-4 font-semibold">Pogoda</h2>

        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
          </div>
        ) : error ? (
          <p className="text-red-600 text-center">{error}</p>
        ) : forecast && air ? (
          <>
             <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
              <ThermometerSnowflake className="w-5 h-5 text-blue-600" />
              <span className="text-base font-medium">
                Min&nbsp;
                <span className="font-semibold">
                  {forecast.daily.temperature_2m_min?.[0]?.toFixed(1) ?? "-"}°C
                </span>
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
              <ThermometerSun className="w-5 h-5 text-red-500" />
              <span className="text-base font-medium">
                Max&nbsp;
                <span className="font-semibold">
                  {forecast.daily.temperature_2m_max?.[0]?.toFixed(1) ?? "-"}°C
                </span>
              </span>
            </div>
           
              

              <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
                <CloudRain className="w-5 h-5 text-blue-600" />
                 <div className="flex flex-col">
                  <span className="font-medium">Opady</span>
                  <span className="text-sm">
                    {forecast.daily.precipitation_sum?.[0]?.toFixed(1) ?? "0"} mm
                  </span>

                </div>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
              <Wind className="w-5 h-5 text-sky-500 rotate-[calc(${forecast.hourly.winddirection_10m?.[0] ?? 0}deg)]" />
              <div className="flex flex-col">
                <span className="font-medium">Wiatr</span>
                <span className="text-sm">
                 {forecast.hourly.windspeed_10m?.[0]
                  ? `${forecast.hourly.windspeed_10m[0]} km/h`
                  : "-"}
                </span>
              </div>
            </div>

              <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
                <Cloud className={`w-5 h-5 ${airQualityColor(air.hourly.pm10?.[0] ?? 0)}`} />
                <div className="flex flex-col">
                  <span className="font-medium">PM10</span>
                  <span className="text-sm">
                    {air.hourly.pm10?.[0] ?? "-"} µg/m³
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
                <Cloud className={`w-5 h-5 ${airQualityColor(air.hourly.pm2_5?.[0] ?? 0)}`} />
                <div className="flex flex-col">
                  <span className="font-medium">PM2.5</span>
                  <span className="text-sm">
                    {air.hourly.pm2_5?.[0] ?? "-"} µg/m³
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
                <Gauge className="w-5 h-5 text-blue-600" />
                <div className="flex flex-col">
                  <span className="font-medium">Ciśnienie</span>
                  <span className="text-sm">
                    {forecast.hourly.pressure_msl?.[0]
                      ? `${forecast.hourly.pressure_msl[0]} hPa`
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
                <Droplet className="w-5 h-5 text-indigo-500" />
                <div className="flex flex-col">
                  <span className="font-medium">Wilgotność</span>
                  <span className="text-sm">
                    {forecast.hourly.relative_humidity_2m?.[0]
                      ? `${forecast.hourly.relative_humidity_2m[0]}%`
                      : "-"}
                  </span>
                </div>
              </div>
            

            <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
                <Sun className="w-5 h-5 text-yellow-500" />
                <span className="text-base font-medium">
                  UV max&nbsp;{forecast.daily.uv_index_max?.[0] ?? "-"}
                </span>
              </div>

              {(() => {
                const biomet = evaluateBiomet(forecast);
                return (
                  <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
                    
                    <Gauge className={`w-5 h-5 ${biomet.color}`} />
                    <div className="flex flex-col">
                    <span className="text-base font-medium">Biomet</span>
                    <span className={`text-sm`}>{biomet.label}</span>
                    </div>
                  </div>
                );
              })()}

            <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
              <Sunrise className="w-5 h-5 text-yellow-400" />
               <div className="flex flex-col">
              <span className="text-base font-medium">Wschód</span>
                <span className="text-sm">
                  {new Date(forecast.daily.sunrise?.[0]).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-md flex items-center space-x-3">
              <Sunset className="w-5 h-5 text-orange-500" />
               <div className="flex flex-col">
              <span className="text-base font-medium">Zachód</span>
                <span className="text-sm">
                  {new Date(forecast.daily.sunset?.[0]).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                </div>
            </div>
            </div>
            
            <h3 className="text-lg font-semibold mb-2">Prognoza na kolejne 24h</h3>
            <div className="overflow-x-auto bg-white rounded-xl shadow-md mb-6">
              <table className="min-w-full text-sm table-auto">
                <thead className="bg-white text-gray-700 font-semibold">
                  <tr>
                    <th className="p-2 text-left">Godz</th>
                    <th className="p-2 text-left">Temp.</th>
                    <th className="p-2 text-left">Opady</th>
                    <th className="p-2 text-left">Wiatr</th>
                    <th className="p-2 text-left">UV</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {(() => {
                    const now = getAppDateTime();
                    const currentISO = now.toISOString();
                    const start = forecast.hourly.time.findIndex((t: string) => t >= currentISO);
                    return forecast.hourly.time.slice(start, start + 24).map((time: string, i: number) => (
                      <tr key={time} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="px-2 py-2">
                          {new Date(time).toLocaleTimeString("pl-PL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-2 py-2">{forecast.hourly.temperature_2m[start + i]}°C</td>
                        <td className="px-2 py-2">{forecast.hourly.precipitation[start + i]} mm</td>
                        <td className="px-2 py-2">{forecast.hourly.windspeed_10m[start + i]} km/h</td>
                        <td className="px-2 py-2">{forecast.hourly.uv_index[start + i]}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold mb-2">Prognoza na kolejne dni</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 mb-6">
              {forecast.daily.time.map((date: string, i: number) => (
                <div key={date} className="bg-white p-4 rounded-xl text-center shadow">
                  <p className="text-sm text-gray-600">
                    {new Date(date).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <div className="my-2 flex justify-center">
                    <WeatherIcon code={forecast.daily.weathercode[i]} />
                  </div>
                  <p className="text-base font-semibold">
                    {forecast.daily.temperature_2m_min[i]}° – {forecast.daily.temperature_2m_max[i]}°
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center">Brak danych pogodowych.</p>
        )}
      </Layout>
    </>
  );
}
