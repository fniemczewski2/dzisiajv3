"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudSnow,
  CloudRain,
  CloudLightning,
  Gauge,
  Droplet,
  ThermometerSnowflake,
  ThermometerSun,
  Wind,
  Sunrise,
  Sunset,
} from "lucide-react";
import { getAppDateTime } from "../lib/dateUtils";
import NoResultsState from "../components/NoResultsState";
import { useToast } from "../providers/ToastProvider";
import Seo from "../components/SEO";

interface HourlyRow {
  time: string;
  temp: number;
  precip: number;
  wind: number;
  uv: number;
  index: number;
}

function WeatherIcon({ code }: { readonly code: number }) {
  if (code <= 1) return <Sun className="w-10 h-10 text-yellow-500 drop-shadow-sm" />;
  if (code === 2) return <CloudSun className="w-10 h-10 text-yellow-500 drop-shadow-sm" />;
  if (code <= 3) return <Cloud className="w-10 h-10 text-gray-400 dark:text-gray-500 drop-shadow-sm" />;
  if (code <= 48) return <CloudFog className="w-10 h-10 text-gray-400 dark:text-gray-500 drop-shadow-sm" />;
  if (code <= 67) return <CloudDrizzle className="w-10 h-10 text-blue-400 drop-shadow-sm" />;
  if (code <= 77) return <CloudSnow className="w-10 h-10 text-blue-300 drop-shadow-sm" />;
  if (code <= 82) return <CloudRain className="w-10 h-10 text-primary drop-shadow-sm" />;
  if (code <= 86) return <CloudSnow className="w-10 h-10 text-blue-300 drop-shadow-sm" />;
  return <CloudLightning className="w-10 h-10 text-yellow-500 dark:text-yellow-400 drop-shadow-sm" />;
}

function airQualityColor(value: number): string {
  if (value <= 20) return "text-green-600 dark:text-green-400";
  if (value <= 35) return "text-green-500";
  if (value <= 50) return "text-yellow-500 dark:text-yellow-400";
  if (value <= 100) return "text-orange-500 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function evaluateBiomet(forecast: any) {
  const t = forecast?.hourly.temperature_2m?.[0];
  const p = forecast?.hourly.pressure_msl?.[0];
  const h = forecast?.hourly.relative_humidity_2m?.[0];
  const w = forecast?.hourly.windspeed_10m?.[0];

  if (t == null || p == null || h == null || w == null) {
    return { label: "Brak danych", color: "text-textMuted" };
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

  if (score >= 75) return { label: "Korzystny", color: "text-green-600 dark:text-green-400" };
  if (score >= 50) return { label: "Umiarkowany", color: "text-yellow-600 dark:text-yellow-400" };
  return { label: "Niekorzystny", color: "text-red-600 dark:text-red-400" };
}

export default function WeatherPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [air, setAir] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Uniwersalne odwołanie do obiektu navigator
    const nav = globalThis.navigator;

    if (!nav?.geolocation) {
      setError("Geolokalizacja nie jest wspierana.");
      setLoading(false);
      return;
    }

    nav.geolocation.getCurrentPosition(
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

          if (!forecastRes.ok || !airRes.ok) throw new Error("Brak danych pogodowych!");

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

  useEffect(() => {
      let toastId: string | undefined;
      if (loading) toastId = toast.loading("Ładowanie pogody...");
      return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [loading, toast]);

  // 1. Obliczenia wyciągnięte poza Render (Brak IIFE w JSX)
  const hourlyData: HourlyRow[] = (() => {
    if (!forecast?.hourly) return [];
    const now = getAppDateTime();
    const currentISO = now.toISOString();
    const start = forecast.hourly.time.findIndex((t: string) => t >= currentISO);
    if (start === -1) return [];
    
    return forecast.hourly.time.slice(start, start + 24).map((time: string, i: number) => ({
      time,
      temp: forecast.hourly.temperature_2m[start + i],
      precip: forecast.hourly.precipitation[start + i],
      wind: forecast.hourly.windspeed_10m[start + i],
      uv: forecast.hourly.uv_index[start + i],
      index: i
    }));
  })();

  const biomet = forecast ? evaluateBiomet(forecast) : null;

  // 2. Rozwiązanie problemu "Nested Ternary" za pomocą czystej instrukcji warunkowej
  let content;

  if (error) {
    content = <p className="text-red-600 dark:text-red-400 text-center font-medium">{error}</p>;
  } else if (forecast && air) {
    content = (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <ThermometerSnowflake className="w-5 h-5 text-blue-500" />
            <span className="text-base font-medium text-text">
              {"Min "}
              <span className="font-semibold">
                {forecast.daily.temperature_2m_min?.[0]?.toFixed(1) ?? "-"}°C
              </span>
            </span>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <ThermometerSun className="w-5 h-5 text-red-500" />
            <span className="text-base font-medium text-text">
              {"Max "}
              <span className="font-semibold">
                {forecast.daily.temperature_2m_max?.[0]?.toFixed(1) ?? "-"}°C
              </span>
            </span>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <CloudRain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="flex flex-col text-text">
              <span className="font-medium">Opady</span>
              <span className="text-sm">
                {forecast.daily.precipitation_sum?.[0]?.toFixed(1) ?? "0"} mm
              </span>
            </div>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Wind className="w-5 h-5 text-sky-500" style={{ transform: `rotate(${forecast.hourly.winddirection_10m?.[0] ?? 0}deg)` }} />
            <div className="flex flex-col text-text">
              <span className="font-medium">Wiatr</span>
              <span className="text-sm">
                {forecast.hourly.windspeed_10m?.[0] ? `${forecast.hourly.windspeed_10m[0]} km/h` : "-"}
              </span>
            </div>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Cloud className={`w-5 h-5 ${airQualityColor(air.hourly.pm10?.[0] ?? 0)}`} />
            <div className="flex flex-col text-text">
              <span className="font-medium">PM10</span>
              <span className="text-sm">
                {air.hourly.pm10?.[0] ?? "-"} µg/m³
              </span>
            </div>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Cloud className={`w-5 h-5 ${airQualityColor(air.hourly.pm2_5?.[0] ?? 0)}`} />
            <div className="flex flex-col text-text">
              <span className="font-medium">PM2.5</span>
              <span className="text-sm">
                {air.hourly.pm2_5?.[0] ?? "-"} µg/m³
              </span>
            </div>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col text-text">
              <span className="font-medium">Ciśnienie</span>
              <span className="text-sm">
                {forecast.hourly.pressure_msl?.[0] ? `${forecast.hourly.pressure_msl[0]} hPa` : "-"}
              </span>
            </div>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Droplet className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <div className="flex flex-col text-text">
              <span className="font-medium">Wilgotność</span>
              <span className="text-sm">
                {forecast.hourly.relative_humidity_2m?.[0] ? `${forecast.hourly.relative_humidity_2m[0]}%` : "-"}
              </span>
            </div>
          </div>
        
          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Sun className="w-5 h-5 text-yellow-500" />
            <div className="flex flex-col text-text">
              <span className="font-medium">UV max</span>
              <span className="text-sm">{forecast.daily.uv_index_max?.[0] ?? "-"}</span>
            </div>
          </div>

          {/* Czyste wywołanie biometu */}
          {biomet && (
            <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
              <Gauge className={`w-5 h-5 ${biomet.color}`} />
              <div className="flex flex-col text-text">
                <span className="text-base font-medium">Biomet</span>
                <span className={`text-sm ${biomet.color}`}>{biomet.label}</span>
              </div>
            </div>
          )}

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Sunrise className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
            <div className="flex flex-col text-text">
              <span className="text-base font-medium">Wschód</span>
              <span className="text-sm">
                {new Date(forecast.daily.sunrise?.[0]).toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="card p-3 rounded-xl shadow flex items-center space-x-3">
            <Sunset className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            <div className="flex flex-col text-text">
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

        <h3 className="text-lg font-semibold mb-2 text-text">Prognoza na kolejne 24h</h3>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl shadow-md mb-6">
          <table className="min-w-full text-sm table-auto text-left">
            <thead className="bg-surface text-textSecondary font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-2">Godz</th>
                <th className="p-2">Temp.</th>
                <th className="p-2">Opady</th>
                <th className="p-2">Wiatr</th>
                <th className="p-2">UV</th>
              </tr>
            </thead>
            <tbody className="text-textSecondary">
              {hourlyData.map((row) => (
                <tr key={row.time} className={row.index % 2 === 0 ? "bg-card" : "bg-surface"}>
                  <td className="px-2 py-2 text-text font-medium">
                    {new Date(row.time).toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-2 py-2 text-text font-medium">{row.temp}°C</td>
                  <td className="px-2 py-2">{row.precip} mm</td>
                  <td className="px-2 py-2">{row.wind} km/h</td>
                  <td className="px-2 py-2">{row.uv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-text">Prognoza na kolejne dni</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 mb-6">
          {forecast.daily.time.slice(1).map((date: string, i: number) => (
            <div key={date} className="card p-4 rounded-xl text-center shadow">
              <p className="text-sm text-textSecondary">
                {new Date(date).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <div className="my-2 flex justify-center">
                <WeatherIcon code={forecast.daily.weathercode[i + 1]} />
              </div>
              <p className="text-base font-semibold text-text">
                {forecast.daily.temperature_2m_min[i + 1]}° – {forecast.daily.temperature_2m_max[i + 1]}°
              </p>
            </div>
          ))}
        </div>
      </>
    );
  } else {
    content = <NoResultsState text="danych pogodowych" />;
  }

  // 3. Ultra-czysty główny Return
  return (
    <>
      <Seo
        title="Pogoda - Dzisiaj v3"
        description="Bądź na bieżąco. Sprawdź aktualną prognozę pogody, by idealnie zaplanować swój dzień."
        canonical="https://dzisiajv3.vercel.app/weather"
        keywords="pogoda, prognoza pogody, warunki atmosferyczne, aura, temperatura"
      />
        <h2 className="text-xl mb-4 font-semibold text-text">Pogoda</h2>
        {content}
    </>
  );
}