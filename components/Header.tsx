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
} from "lucide-react";

export default function Header() {
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [dailyMin, setDailyMin] = useState<number | null>(null);
  const [dailyMax, setDailyMax] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  useEffect(() => {
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

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", coords.latitude.toString());
      url.searchParams.set("longitude", coords.longitude.toString());
      url.searchParams.set("current_weather", "true");
      url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max");
      url.searchParams.set("timezone", "auto");
      const res = await fetch(url.toString());
      const json = await res.json();

      setCurrentTemp(json.current_weather.temperature);
      setWeatherCode(json.current_weather.weathercode);
      setDailyMin(json.daily.temperature_2m_min[0]);
      setDailyMax(json.daily.temperature_2m_max[0]);
    });

    return () => clearInterval(timer);
  }, []);

  function WeatherIcon({ code }: { code: number }) {
    if (code === 0) return <Sun className="w-6 h-6 text-primary" />;
    if (code <= 3) return <Cloud className="w-6 h-6 text-primary" />;
    if (code <= 48) return <CloudFog className="w-6 h-6 text-primary" />;
    if (code <= 57) return <CloudDrizzle className="w-6 h-6 text-primary" />;
    if (code <= 67) return <CloudRain className="w-6 h-6 text-primary" />;
    if (code <= 77) return <CloudSnow className="w-6 h-6 text-primary" />;
    return <CloudLightning className="w-6 h-6 text-primary" />;
  }

  return (
    <header
      className="
        bg-card shadow-md rounded-xl p-4
        flex
        justify-center
        w-full
      "
    >
      <div
        className="m-0 p-0 grid grid-cols-1 gap-4
        sm:grid-cols-3 sm:gap-0 max-w-[1600px] w-full"
      >
        {/* 1) Tytuł */}
        <h1 className="text-2xl font-bold text-primary text-center sm:text-left">
          Dzisiaj v3
        </h1>

        {/* 2) Na mobile: flex-row — zegar obok pogody; na desktopie kolumna w środe */}
        <div
          className="
          flex justify-between items-center 
          sm:flex-col sm:items-center sm:w-auto 
        "
        >
          {/* czas + data */}
          <div className="text-gray-700 text-left sm:text-center">
            <div className="text-xl">{currentTime}</div>
            <span className="text-gray-500 text-[12px] sm:text-sm">
              {currentDate}
            </span>
          </div>

          <div className="sm:hidden block">
            {currentTemp != null &&
              dailyMin != null &&
              dailyMax != null &&
              weatherCode != null && (
                <div className="flex flex-col items-left text-gray-700">
                  <div className="flex items-center justify-end space-x-1 mb-1">
                    <WeatherIcon code={weatherCode} />
                    <span className="text-xl">{currentTemp}°C</span>
                  </div>
                  <span className="text-gray-500 text-[12px] ml-5">
                    min {dailyMin}° · max {dailyMax}°
                  </span>
                </div>
              )}
          </div>
        </div>
        {/* 3) Pusta kolumna na desktopie (wyrównanie) */}
        <div className="hidden sm:flex sm:justify-end sm:items-center">
          {currentTemp != null &&
            dailyMin != null &&
            dailyMax != null &&
            weatherCode != null && (
              <div className="flex flex-col items-center justify-end text-gray-700">
                <div className="flex items-end justify-end space-x-1 mb-1">
                  <WeatherIcon code={weatherCode} />
                  <span className="text-xl">{currentTemp}°C</span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>min {dailyMin}°</span> · <span>max {dailyMax}°</span>
                </div>
              </div>
            )}
        </div>
      </div>
    </header>
  );
}
