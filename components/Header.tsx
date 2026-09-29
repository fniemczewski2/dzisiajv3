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
import Link from "next/link";
import BirthdayIndicator from "./calendar/BirthdayIndicator";
import { useWeather } from "../hooks/useWeather";

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
        type="button"
        className="flex flex-col items-end cursor-pointer px-2.5 py-1.5 -m-1.5 rounded-xl hover:bg-(--header-hover) transition-colors focus-visible:outline-(--header-accent)"
        aria-label={`Pogoda: ${currentTemp}°C, odczuwalnie od ${dailyMin}° do ${dailyMax}°. Otwórz pełną prognozę`}
      >
        <div className="font-display text-2xl sm:text-3xl font-semibold leading-none mb-1.5 flex items-center gap-1.5 tabular-nums">
          <WeatherIcon
            code={weatherCode}
            className="w-5 h-5 sm:w-6 sm:h-6 text-(--header-accent)"
          />
          <span>{currentTemp}°</span>
        </div>
        <span className="whitespace-nowrap text-xs sm:text-sm font-medium text-(--header-muted) tabular-nums">
          {dailyMin}° / {dailyMax}°
        </span>
        {airQuality && (
          <span className="mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-(--header-warn)/15 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-(--header-warn)">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-(--header-warn)" />
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
        weekday: "long", month: "long", day: "numeric",
      })
    );
    setCurrentTime(now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));

    const timer = setInterval(() => {
      if (!isMounted) return;
      const tick = new Date();
      setCurrentTime(tick.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));

      const newDateStr = `${tick.getFullYear()}-${String(tick.getMonth() + 1).padStart(2, "0")}-${String(tick.getDate()).padStart(2, "0")}`;
      setTodayDateString((prev) => (prev === newDateStr ? newDateStr : prev));
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="w-full max-w-[1600px] rounded-card bg-(--header-bg) text-(--header-fg) shadow-lg border border-transparent dark:border-line-strong px-4 py-3.5 sm:px-6 sm:py-4 transition-colors">
      <div className="w-full flex justify-between items-center gap-3">
        <div className="flex flex-1 items-center min-w-0">
          <button
            onClick={() => router.push("/calendar?reset=true")}
            className="flex flex-col items-start cursor-pointer px-2.5 py-1.5 -m-1.5 min-w-0 rounded-xl hover:bg-(--header-hover) transition-colors focus-visible:outline-(--header-accent)"
            aria-label={`${currentDate}. Otwórz kalendarz`}
            type="button"
          >
            <div className="font-display text-2xl sm:text-3xl font-semibold leading-none mb-1.5 tabular-nums" suppressHydrationWarning>
              {currentTime}
            </div>
            <span className="text-xs sm:text-sm font-medium text-(--header-muted) truncate mb-0.5 first-letter:uppercase">
              {currentDate}
            </span>
            <BirthdayIndicator date={todayDateString} />
          </button>
        </div>

        <Link
          href="/"
          className="hidden sm:flex flex-1 items-center justify-center rounded-xl px-2 py-1 focus-visible:outline-(--header-accent)"
          aria-label="Dzisiaj.Fun – strona główna"
        >
          <span className="font-display text-2xl font-bold" style={{ fontVariationSettings: '"opsz" 72' }}>
            Dzisiaj<span className="text-(--header-accent)">.Fun</span>
          </span>
        </Link>

        <div className="flex flex-1 justify-end items-center">
          {weatherLoading ? (
            <div role="status" aria-label="Ładowanie pogody" className="flex flex-col items-end gap-2">
              <span className="block h-7 w-20 rounded-md bg-(--header-hover) animate-pulse" />
              <span className="block h-3 w-14 rounded bg-(--header-hover) animate-pulse" />
            </div>
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
      </div>
    </header>
  );
}
