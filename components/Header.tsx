// components/Header.tsx

import { useState, useEffect, memo } from "react";
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
import LoadingState from "./LoadingState";
import BirthdayIndicator from "./calendar/BirthdayIndicator";
import { useToast } from "../providers/ToastProvider";

function WeatherIcon({
  code,
  className = "",
}: {
  code: number;
  className?: string;
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

const StableBirthdayIndicator = memo(function StableBirthdayIndicator({
  date,
}: {
  date: string;
}) {
  return <BirthdayIndicator date={date} />;
});

export default function Header() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  const [todayDateString, setTodayDateString] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [currentTime, setCurrentTime] = useState("");
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [dailyMin, setDailyMin] = useState<number | null>(null);
  const [dailyMax, setDailyMax] = useState<number | null>(null);
  const [airQuality, setAirQuality] = useState<string | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);

    const now = new Date();

    setCurrentDate(
      now.toLocaleDateString("pl-PL", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
    setCurrentTime(now.toLocaleTimeString("pl-PL"));

    const timer = setInterval(() => {
      if (!isMounted) return;

      const tick = new Date();
      setCurrentTime(tick.toLocaleTimeString("pl-PL"));

      const newDateStr = `${tick.getFullYear()}-${String(tick.getMonth() + 1).padStart(2, "0")}-${String(tick.getDate()).padStart(2, "0")}`;
      setTodayDateString((prev) => (prev !== newDateStr ? newDateStr : prev));
    }, 1000);

    if (!navigator.geolocation) {
      setLoading(false);
      return () => {
        isMounted = false;
        clearInterval(timer);
      };
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
          weatherUrl.searchParams.set("latitude", coords.latitude.toString());
          weatherUrl.searchParams.set("longitude", coords.longitude.toString());
          weatherUrl.searchParams.set("current_weather", "true");
          weatherUrl.searchParams.set(
            "daily",
            "apparent_temperature_min,apparent_temperature_max"
          );
          weatherUrl.searchParams.set("timezone", "auto");

          const weatherRes = await fetch(weatherUrl.toString(), { signal });
          if (!isMounted) return;
          const weatherJson = await weatherRes.json();

          if (isMounted) {
            setCurrentTemp(weatherJson.current_weather.temperature);
            setWeatherCode(weatherJson.current_weather.weathercode);
            setDailyMin(
              Math.min(...weatherJson.daily.apparent_temperature_min)
            );
            setDailyMax(
              Math.max(...weatherJson.daily.apparent_temperature_max)
            );
          }

          const airUrl = new URL(
            "https://air-quality-api.open-meteo.com/v1/air-quality"
          );
          airUrl.searchParams.set("latitude", coords.latitude.toString());
          airUrl.searchParams.set("longitude", coords.longitude.toString());
          airUrl.searchParams.set("hourly", "pm10,pm2_5");
          airUrl.searchParams.set("timezone", "auto");

          const airRes = await fetch(airUrl.toString(), { signal });
          if (!isMounted) return;
          const airJson = await airRes.json();

          if (
            isMounted &&
            airJson.hourly &&
            (airJson.hourly.pm10[0] > 45 || airJson.hourly.pm2_5[0] > 15)
          ) {
            setAirQuality(
              airJson.hourly.pm2_5[0] - 15 > airJson.hourly.pm10[0] - 45
                ? `${airJson.hourly.pm2_5[0]} µg/m³ PM2.5`
                : `${airJson.hourly.pm10[0]} µg/m³ PM10`
            );
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          toast.error("Wystąpił błąd pobierania danych pogodowych");
        } finally {
          if (isMounted) setLoading(false);
        }
      },
      () => {
        toast.error("Wystąpił błąd lokalizacji.");
        if (isMounted) setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      isMounted = false;
      clearInterval(timer);
      controller.abort();
    };
  }, []);

  return (
    <header className="card shadow-sm rounded-2xl p-4 transition-colors w-full flex justify-center">
      <span className="max-w-[1600px] w-full m-0 p-0 flex justify-between items-start gap-3">

        <div className="shrink-0 flex flex-1">
          <div
            onClick={() => router.push("/calendar")}
            className="flex flex-col items-start cursor-pointer group p-2 -m-2 min-w-0 rounded-xl hover:bg-surface transition-colors"
            title="Kliknij, aby zobaczyć pełną prognozę"
          >
            <div className="text-2xl sm:text-3xl font-bold text-text tracking-tighter leading-none mb-1.5">
              {currentTime}
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-textMuted uppercase tracking-wider truncate">
              {currentDate}
            </span>
            <div className="mt-1">
              <StableBirthdayIndicator date={todayDateString} />
            </div>
          </div>
        </div>

        <div className="hidden sm:flex flex-col flex-1 items-center justify-center">
          <h1 className="text-2xl font-bold text-text tracking-wider">
            Dzisiaj <span className="text-primary opacity-80">v3</span>
          </h1>
        </div>

        <div className="shrink-0 flex flex-1 justify-end">
          {loading ? (
            <LoadingState />
          ) : currentTemp != null &&
            dailyMin != null &&
            dailyMax != null &&
            weatherCode != null ? (
            <div
              onClick={() => router.push("/weather")}
              className="flex flex-col items-end cursor-pointer group p-2 -m-2 rounded-xl hover:bg-surface transition-colors"
              title="Kliknij, aby zobaczyć pełną prognozę"
            >
              <div className="text-2xl sm:text-3xl font-bold text-text tracking-tighter leading-none mb-1.5 flex items-center gap-1">
                <WeatherIcon
                  code={weatherCode}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
                <span className="font-bold leading-none">{currentTemp}°C</span>
              </div>
              <span className="whitespace-nowrap text-[10px] sm:text-xs font-bold text-textMuted uppercase tracking-wider truncate">
                min {dailyMin}° · max {dailyMax}°
              </span>
              {airQuality && (
                <span className="whitespace-nowrap text-[10px] sm:text-sm font-medium text-red-600 dark:text-red-400 px-1.5 py-0.5 mt-1 rounded uppercase tracking-wider">
                  {airQuality}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </span>
    </header>
  );
}