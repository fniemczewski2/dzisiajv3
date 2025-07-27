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
  Loader2,
} from "lucide-react";
import { useRouter } from "next/router";


export default function Header() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [dailyMin, setDailyMin] = useState<number | null>(null);
  const [dailyMax, setDailyMax] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    setCurrentDate(
      now.toLocaleDateString("pl-PL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
    setCurrentTime(now.toLocaleTimeString("pl-PL"));

    const timer = setInterval(() => {
      const tick = new Date();
      setCurrentTime(tick.toLocaleTimeString("pl-PL"));
    }, 1000);

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = new URL("https://api.open-meteo.com/v1/forecast");
          url.searchParams.set("latitude", coords.latitude.toString());
          url.searchParams.set("longitude", coords.longitude.toString());
          url.searchParams.set("current_weather", "true");
          url.searchParams.set(
            "daily",
            "apparent_temperature_min,apparent_temperature_max"
          );
          url.searchParams.set("timezone", "auto");

          const res = await fetch(url.toString());
          if (!res.ok) {
            throw new Error("Weather API error");
          }

          const json = await res.json();
          setCurrentTemp(json.current_weather.temperature);
          setWeatherCode(json.current_weather.weathercode);
          setDailyMin(Math.min(...json.daily.apparent_temperature_min));
          setDailyMax(Math.max(...json.daily.apparent_temperature_max));
        } catch (error) {
        }
      },
      (error) => {
        console.error(
          "Geolocation permission denied or error occurred:",
          error
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
    setLoading(false);
    return () => clearInterval(timer);
  }, []);

  function WeatherIcon({ code }: { code: number }) {
    if (code <= 1) return <Sun className="w-6 h-6 text-gray-600" />;
    if (code === 2) return <CloudSun className="w-6 h-6 text-gray-600" />;
    if (code <= 3) return <Cloud className="w-6 h-6 text-gray-600" />;
    if (code <= 48) return <CloudFog className="w-6 h-6 text-gray-600" />;
    if (code <= 67) return <CloudDrizzle className="w-6 h-6 text-gray-600" />;
    if (code <= 77) return <CloudSnow className="w-6 h-6 text-gray-600" />;
    if (code <= 82) return <CloudRain className="w-6 h-6 text-gray-600" />;
    if (code <= 86) return <CloudSnow className="w-6 h-6 text-gray-600" />;
    return <CloudLightning className="w-6 h-6 text-gray-600" />;
  }

  return (
    <header
      className="
        bg-card shadow-md rounded-xl px-3 py-2 sm:p-4
        flex
        justify-center
        w-full
        flex-row
        flex-nowrap
      "
    >
        
          <div className="text-gray-600 text-left flex flex-col flex-1">
            <div className="text-xl font-semibold">{currentTime}</div>
            <span className="text-gray-500 text-[12px] sm:text-sm">
              {currentDate}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-primary sm:block hidden flex-1 text-center">
            Dzisiaj v3
          </h1>

            {currentTemp != null &&
              dailyMin != null &&
              dailyMax != null &&
              weatherCode != null && (
                loading ? <Loader2 className="flex-1 animate-spin w-6 h-6 text-gray-500" /> :
                <div onClick={() => router.push("/weather")} className="flex flex-col flex-1 items-left text-gray-700">
                  <div className="flex items-center text-xl font-semibold justify-end space-x-1">
                    <WeatherIcon code={weatherCode} />
                    <span className="text-xl text-gray-600">{currentTemp}°C</span>
                  </div>
                  <span className="text-gray-600 text-[12px] sm:text-sm ml-5 text-right">
                    min {dailyMin}° · max {dailyMax}°
                  </span>
                </div>
              )}

    </header>
  );
}
