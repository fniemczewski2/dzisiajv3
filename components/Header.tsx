// components/Header.tsx

import { useState, useEffect } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  CloudSun,
} from "lucide-react";
import { useRouter } from "next/router";
import LoadingState from "./ui/LoadingState";
import BirthdayIndicator from "./calendar/BirthdayIndicator";
import { useWeather } from "../lib/useWeather";

interface WeatherdetailsProps {
  currentTemp: number | null;
  dailyMin: number | null;
  dailyMax: number | null;
  weatherCode: number | null;
  airQuality: string | null;
}

function WeatherIcon({
  code,
  className = "",
}: {
  readonly code: number;
  readonly className?: string;
}) {
  if (code <= 1) return <Sun className={className} />;
  if (code === 2) return <CloudSun className={className} />;
  if (code <= 3) return <Cloud className={className} />;
  if (code <= 48) return <CloudFog className={className} />;
  if (code <= 67) return <CloudDrizzle className={className} />;
  if (code <= 77) return <CloudSnow className={className} />;
  if (code <= 82) return <CloudRain className={className} />;
  if (code <= 86) return <CloudSnow className={className} />;
  return <CloudLightning className={className} />;
}

function WeatherDetails({
  currentTemp,
  dailyMin,
  dailyMax,
  weatherCode,
  airQuality,
}: 
  Readonly<WeatherdetailsProps>
) {
  const router = useRouter();

  if (
    currentTemp != null &&
    dailyMin != null &&
    dailyMax != null &&
    weatherCode != null
  ) {
    return (
      <button
        onClick={() => router.push("/weather")}
        className="flex flex-col items-end cursor-pointer group px-2 -m-2 rounded-xl hover:bg-surface transition-colors"
        title="Kliknij, aby zobaczyć pełną prognozę"
      >
        <div className="text-2xl sm:text-3xl font-bold text-text tracking-tighter leading-none mb-1.5 flex items-center gap-1">
          <WeatherIcon
            code={weatherCode}
            className="w-5 h-5 sm:w-6 sm:h-6"
          />
          <span className="font-bold leading-none">{currentTemp}°C</span>
        </div>
        <span className="whitespace-nowrap text-[11px] sm:text-sm font-bold text-textMuted uppercase tracking-wider truncate">
          min {dailyMin}° · max {dailyMax}°
        </span>
        {airQuality && (
          <span className="whitespace-nowrap text-[10px] sm:text-sm font-medium text-red-800 dark:text-red-200 uppercase tracking-wider">
            {airQuality}
          </span>
        )}
      </button>
    );
  }

  return null;
}

export default function Header() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [todayDateString, setTodayDateString] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  
  const { forecast, air, loading: weatherLoading } = useWeather();

  const currentTemp = forecast?.current_weather?.temperature ?? null;
  const weatherCode = forecast?.current_weather?.weathercode ?? null;
  const dailyMin = forecast?.daily?.apparent_temperature_min?.[0] ?? null;
  const dailyMax = forecast?.daily?.apparent_temperature_max?.[0] ?? null;
  
  let airQuality = null;
  if (air?.hourly && (air.hourly.pm10[0] > 45 || air.hourly.pm2_5[0] > 15)) {
    airQuality = air.hourly.pm2_5[0] - 15 > air.hourly.pm10[0] - 45
      ? `${air.hourly.pm2_5[0]} µg/m³ PM2.5`
      : `${air.hourly.pm10[0]} µg/m³ PM10`;
  }

  useEffect(() => {
    let isMounted = true;
    const now = new Date();

    setCurrentDate(
      now.toLocaleDateString("pl-PL", {
        weekday: "short", year: "numeric", month: "long", day: "numeric",
      })
    );
    setCurrentTime(now.toLocaleTimeString("pl-PL"));

    const timer = setInterval(() => {
      if (!isMounted) return;
      const tick = new Date();
      setCurrentTime(tick.toLocaleTimeString("pl-PL"));

      const newDateStr = `${tick.getFullYear()}-${String(tick.getMonth() + 1).padStart(2, "0")}-${String(tick.getDate()).padStart(2, "0")}`;
      setTodayDateString((prev) => (prev === newDateStr ? newDateStr : prev));
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="card shadow-sm rounded-2xl p-4 transition-colors w-full max-w-[1600px] flex justify-center">
      <span className="max-w-[1600px] w-full m-0 p-0 flex justify-between items-center gap-3">

        <div className="shrink-0 flex flex-1 items-center">
          <button
            onClick={() => router.push("/calendar?reset=true")}
            className="flex flex-col items-start cursor-pointer group px-2 -m-2 min-w-0 rounded-xl hover:bg-surface transition-colors"
            title="Kliknij, aby zobaczyć kalendarz"
          >
            <div className="text-2xl sm:text-3xl font-bold text-text tracking-tighter leading-none mb-1.5">
              {currentTime}
            </div>
            <span className="text-[11px] sm:text-sm font-bold text-textMuted uppercase tracking-wider truncate mb-1">
              {currentDate}
            </span>
            <BirthdayIndicator date={todayDateString} />
          </button>
        </div>

        <div className="hidden sm:flex flex-col flex-1 items-center justify-center">
          <h1 className="text-2xl font-bold text-text tracking-wider">
            Dzisiaj <span className="text-primary opacity-80">v3</span>
          </h1>
        </div>

        <div className="shrink-0 flex flex-1 justify-end items-center">
          {weatherLoading ? (
            <LoadingState />
          ) : (
            <WeatherDetails 
              currentTemp={currentTemp} 
              dailyMin={dailyMin} 
              dailyMax={dailyMax} 
              weatherCode={weatherCode} 
              airQuality={airQuality} 
            />
          )}
        </div>
      </span>
    </header>
  );
}