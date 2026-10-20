// components/Header.tsx

import { format } from "date-fns";
import { useIsClient } from "@/hooks/useIsClient";
import { useNow } from "@/hooks/useNow";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  CloudSun,
  Flame,
} from "lucide-react";
import { useRouter } from "next/router";
import BirthdayIndicator from "./calendar/BirthdayIndicator";
import { useWeather } from "../hooks/useWeather";
import { useAppStreak } from "../hooks/useAppStreak";

interface WeatherdetailsProps {
  currentTemp: number | null;
  dailyMin: number | null;
  dailyMax: number | null;
  weatherCode: number | null;
  airQuality: string | null;
}

function WeatherIcon({ code, className = "" }: { readonly code: number; readonly className?: string }) {
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

function WeatherDetails({ currentTemp, dailyMin, dailyMax, weatherCode, airQuality }: Readonly<WeatherdetailsProps>) {
  const router = useRouter();

  if (currentTemp != null && dailyMin != null && dailyMax != null && weatherCode != null) {
    return (
      <button
        onClick={() => router.push("/weather")}
        type="button"
        className="-m-1.5 flex min-h-11 cursor-pointer flex-col items-end rounded-xl px-2.5 py-1.5 transition-colors hover:bg-(--header-hover)"
        aria-label={`Pogoda: ${currentTemp}°C, odczuwalnie od ${dailyMin}° do ${dailyMax}°. Otwórz pełną prognozę`}
      >
        <div className="mb-1.5 flex items-center gap-1.5 text-2xl leading-none font-semibold tabular-nums sm:text-3xl">
          <WeatherIcon code={weatherCode} className="h-5 w-5 text-(--header-accent) sm:h-6 sm:w-6" />
          <span>{currentTemp}°</span>
        </div>
        <span className="text-xs font-medium whitespace-nowrap text-(--header-muted) tabular-nums sm:text-sm">
          {dailyMin}° / {dailyMax}°
        </span>
        {airQuality && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warning">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning-line" />
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
  const now = useNow(1000);
  const isClient = useIsClient();
  const currentTime = isClient ? now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
  const currentDate = isClient
    ? now.toLocaleDateString("pl-PL", { weekday: "long", month: "short", day: "numeric" })
    : "";
  const todayDateString = format(now, "yyyy-MM-dd");

  const { forecast, air, loading: weatherLoading } = useWeather();
  const streak = useAppStreak();

  const currentTemp = forecast?.current_weather?.temperature ?? null;
  const weatherCode = forecast?.current_weather?.weathercode ?? null;
  const dailyMin = forecast?.daily?.apparent_temperature_min?.[0] ?? null;
  const dailyMax = forecast?.daily?.apparent_temperature_max?.[0] ?? null;

  let airQuality = null;
  if (air?.hourly && (air.hourly.pm10[0] > 45 || air.hourly.pm2_5[0] > 15)) {
    airQuality =
      air.hourly.pm2_5[0] - 15 > air.hourly.pm10[0] - 45
        ? `${air.hourly.pm2_5[0]} µg/m³ PM2.5`
        : `${air.hourly.pm10[0]} µg/m³ PM10`;
  }

  return (
    <header className="w-full max-w-[1600px] border-b border-line px-1 pt-2 pb-4 text-(--header-fg) sm:px-2 sm:pt-3 sm:pb-5">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center">
          <button
            onClick={() => router.push("/calendar?reset=true")}
            className="-m-1.5 flex min-w-0 cursor-pointer flex-col items-start rounded-xl px-2.5 py-1.5 transition-colors hover:bg-(--header-hover)"
            aria-label={`${currentDate}. Otwórz kalendarz`}
            type="button"
          >
            <div
              className="mb-2 text-[2.5rem] leading-none font-bold tracking-tight tabular-nums sm:text-6xl"
              suppressHydrationWarning
            >
              {currentTime}
            </div>
            <span className="mb-0.5 truncate text-base font-medium text-(--header-muted) first-letter:uppercase sm:text-lg">
              {currentDate}
            </span>
            <BirthdayIndicator date={todayDateString} />
          </button>
        </div>

        <div>
          {streak !== null && streak > 0 && (
            <p
              className="inline-flex items-center font-semibold text-warning tabular-nums md:text-xl"
              title="Kolejne dni korzystania z aplikacji"
            >
              <Flame className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
              <span className="sr-only">Seria: </span>
              {streak}
              <span className="sr-only">dni korzystania z rzędu</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          {isClient && (
            weatherLoading ? (
            <output aria-label="Ładowanie pogody" className="flex flex-col items-end gap-2">
              <span className="block h-7 w-20 animate-pulse rounded-lg bg-(--header-hover)" />
              <span className="block h-3 w-14 animate-pulse rounded-lg bg-(--header-hover)" />
            </output>
          ) : (
            <WeatherDetails
              currentTemp={currentTemp}
              dailyMin={dailyMin}
              dailyMax={dailyMax}
              weatherCode={weatherCode}
              airQuality={airQuality}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
