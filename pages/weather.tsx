// pages/weather.tsx

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
import { getAppDateTime } from "@/lib/dateUtils";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonWeather } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";
import { useWeather } from "@/hooks/useWeather";
import { HourlyRow, WeatherData } from "@/types/weather";

function WeatherIcon({ code }: { readonly code: number }) {
  if (code <= 1) return <Sun className="h-10 w-10 text-warning drop-shadow-sm" />;
  if (code === 2) return <CloudSun className="h-10 w-10 text-warning drop-shadow-sm" />;
  if (code <= 3) return <Cloud className="h-10 w-10 text-text-muted drop-shadow-sm" />;
  if (code <= 48) return <CloudFog className="h-10 w-10 text-text-muted drop-shadow-sm" />;
  if (code <= 67) return <CloudDrizzle className="h-10 w-10 text-info drop-shadow-sm" />;
  if (code <= 77) return <CloudSnow className="h-10 w-10 text-info drop-shadow-sm" />;
  if (code <= 82) return <CloudRain className="h-10 w-10 text-primary drop-shadow-sm" />;
  if (code <= 86) return <CloudSnow className="h-10 w-10 text-info drop-shadow-sm" />;
  return <CloudLightning className="h-10 w-10 text-warning drop-shadow-sm" />;
}

function airQualityColor(value: number): string {
  if (value <= 20) return "text-success ";
  if (value <= 35) return "text-success ";
  if (value <= 50) return "text-warning ";
  if (value <= 100) return "text-warning ";
  return "text-danger ";
}

function evaluateBiomet(forecast: WeatherData) {
  const t = forecast?.hourly.temperature_2m?.[0];
  const p = forecast?.hourly.pressure_msl?.[0];
  const h = forecast?.hourly.relative_humidity_2m?.[0];
  const w = forecast?.hourly.windspeed_10m?.[0];

  if (t == null || p == null || h == null || w == null) {
    return { label: "Brak danych", color: "text-text-muted" };
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

  if (score >= 75) return { label: "Korzystny", color: "text-success " };
  if (score >= 50) return { label: "Umiarkowany", color: "text-warning " };
  return { label: "Niekorzystny", color: "text-danger " };
}

export default function WeatherPage() {
  const { forecast, air, loading, error } = useWeather();
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
      index: i,
    }));
  })();

  const biomet = forecast ? evaluateBiomet(forecast) : null;

  let content;

  if (loading) {
    content = <SkeletonWeather />;
  } else if (error) {
    content = <p className="text-center font-medium text-danger">{error}</p>;
  } else if (forecast && air) {
    content = (
      <>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <ThermometerSnowflake className="h-5 w-5 text-info" />
            <span className="text-base font-medium text-text">
              {"Min "}
              <span className="font-semibold">{forecast.daily.temperature_2m_min?.[0]?.toFixed(1) ?? "-"}°C</span>
            </span>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <ThermometerSun className="h-5 w-5 text-danger" />
            <span className="text-base font-medium text-text">
              {"Max "}
              <span className="font-semibold">{forecast.daily.temperature_2m_max?.[0]?.toFixed(1) ?? "-"}°C</span>
            </span>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <CloudRain className="h-5 w-5 text-info" />
            <div className="flex flex-col text-text">
              <span className="font-medium">Opady</span>
              <span className="text-sm">{forecast.daily.precipitation_sum?.[0]?.toFixed(1) ?? "0"} mm</span>
            </div>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Wind
              className="h-5 w-5 text-info"
              style={{ transform: `rotate(${forecast.hourly.winddirection_10m?.[0] ?? 0}deg)` }}
            />
            <div className="flex flex-col text-text">
              <span className="font-medium">Wiatr</span>
              <span className="text-sm">
                {forecast.hourly.windspeed_10m?.[0] ? `${forecast.hourly.windspeed_10m[0]} km/h` : "-"}
              </span>
            </div>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Cloud className={`h-5 w-5 ${airQualityColor(air.hourly.pm10?.[0] ?? 0)}`} />
            <div className="flex flex-col text-text">
              <span className="font-medium">PM10</span>
              <span className="text-sm">{air.hourly.pm10?.[0] ?? "-"} µg/m³</span>
            </div>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Cloud className={`h-5 w-5 ${airQualityColor(air.hourly.pm2_5?.[0] ?? 0)}`} />
            <div className="flex flex-col text-text">
              <span className="font-medium">PM2.5</span>
              <span className="text-sm">{air.hourly.pm2_5?.[0] ?? "-"} µg/m³</span>
            </div>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Gauge className="h-5 w-5 text-info" />
            <div className="flex flex-col text-text">
              <span className="font-medium">Ciśnienie</span>
              <span className="text-sm">
                {forecast.hourly.pressure_msl?.[0] ? `${forecast.hourly.pressure_msl[0]} hPa` : "-"}
              </span>
            </div>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Droplet className="h-5 w-5 text-deco-violet" />
            <div className="flex flex-col text-text">
              <span className="font-medium">Wilgotność</span>
              <span className="text-sm">
                {forecast.hourly.relative_humidity_2m?.[0] ? `${forecast.hourly.relative_humidity_2m[0]}%` : "-"}
              </span>
            </div>
          </div>

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Sun className="h-5 w-5 text-warning" />
            <div className="flex flex-col text-text">
              <span className="font-medium">UV max</span>
              <span className="text-sm">{forecast.daily.uv_index_max?.[0] ?? "-"}</span>
            </div>
          </div>

          {biomet && (
            <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
              <Gauge className={`h-5 w-5 ${biomet.color}`} />
              <div className="flex flex-col text-text">
                <span className="text-base font-medium">Biomet</span>
                <span className={`text-sm ${biomet.color}`}>{biomet.label}</span>
              </div>
            </div>
          )}

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Sunrise className="h-5 w-5 text-warning" />
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

          <div className="card flex items-center space-x-3 rounded-xl p-3 shadow">
            <Sunset className="h-5 w-5 text-warning" />
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

        <h3 className="mb-2 text-lg font-semibold text-text">Prognoza na kolejne 24h</h3>
        <div className="mb-6 overflow-x-auto rounded-xl border border-line shadow-md">
          <table className="min-w-full table-auto text-left text-sm">
            <thead className="border-b border-line bg-surface font-semibold text-text-secondary">
              <tr>
                <th scope="col" className="p-2">
                  Godz
                </th>
                <th scope="col" className="p-2">
                  Temp.
                </th>
                <th scope="col" className="p-2">
                  Opady
                </th>
                <th scope="col" className="p-2">
                  Wiatr
                </th>
                <th scope="col" className="p-2">
                  UV
                </th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {hourlyData.map((row) => (
                <tr key={row.time} className={row.index % 2 === 0 ? "bg-card" : "bg-surface"}>
                  <td className="px-2 py-2 font-medium text-text">
                    {new Date(row.time).toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-2 py-2 font-medium text-text">{row.temp}°C</td>
                  <td className="px-2 py-2">{row.precip} mm</td>
                  <td className="px-2 py-2">{row.wind} km/h</td>
                  <td className="px-2 py-2">{row.uv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-lg font-semibold text-text">Prognoza na kolejne dni</h3>
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
          {forecast.daily.time.slice(1).map((date: string, i: number) => (
            <div key={date} className="card rounded-xl p-4 text-center shadow">
              <p className="text-sm text-text-secondary">
                {new Date(date).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <div className="my-2 flex justify-center">
                <WeatherIcon code={forecast.daily.weathercode[i + 1]} />
              </div>
              <p className="text-base font-semibold text-text">
                {forecast.daily.temperature_2m_min[i + 1]}° - {forecast.daily.temperature_2m_max[i + 1]}°
              </p>
            </div>
          ))}
        </div>
      </>
    );
  } else {
    content = <NoResultsState text="danych pogodowych" />;
  }

  return (
    <>
      <Seo
        title="Pogoda"
        description="Prognoza pogody dla Twojej lokalizacji z jakością powietrza, indeksem UV oraz godzinami wschodu i zachodu słońca."
        canonical="https://dzisiaj.fun/weather"
        keywords="pogoda, prognoza pogody, warunki atmosferyczne, aura, temperatura"
      />
      <h1 className="page-title mb-4">Pogoda</h1>
      {content}
    </>
  );
}
