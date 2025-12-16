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
import LoadingState from "./LoadingState";
import BirthdayIndicator from "./calendar/BirthdayIndicator";

export default function Header() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [dailyMin, setDailyMin] = useState<number | null>(null);
  const [dailyMax, setDailyMax] = useState<number | null>(null);
  const [airQuality, setAirQuality] = useState<string | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
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
      const tick = new Date();
      setCurrentTime(tick.toLocaleTimeString("pl-PL"));
    }, 1000);

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          // Pogoda
          const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
          weatherUrl.searchParams.set("latitude", coords.latitude.toString());
          weatherUrl.searchParams.set("longitude", coords.longitude.toString());
          weatherUrl.searchParams.set("current_weather", "true");
          weatherUrl.searchParams.set(
            "daily",
            "apparent_temperature_min,apparent_temperature_max"
          );
          weatherUrl.searchParams.set("timezone", "auto");

          const weatherRes = await fetch(weatherUrl.toString());
          const weatherJson = await weatherRes.json();

          setCurrentTemp(weatherJson.current_weather.temperature);
          setWeatherCode(weatherJson.current_weather.weathercode);
          setDailyMin(Math.min(...weatherJson.daily.apparent_temperature_min));
          setDailyMax(Math.max(...weatherJson.daily.apparent_temperature_max));

          // Jakość powietrza
          const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
          airUrl.searchParams.set("latitude", coords.latitude.toString());
          airUrl.searchParams.set("longitude", coords.longitude.toString());
          airUrl.searchParams.set("hourly", "pm10,pm2_5");
          airUrl.searchParams.set("timezone", "auto");

          const airRes = await fetch(airUrl.toString());
          const airJson = await airRes.json();

          if (airJson.hourly && (airJson.hourly.pm10[0] > 45 || airJson.hourly.pm2_5[0] > 15 )) {
            setAirQuality((airJson.hourly.pm2_5[0] - 15) > (airJson.hourly.pm10[0] - 45) ? `${airJson.hourly.pm2_5[0]} µg/m³ PM2.5` : `${airJson.hourly.pm10[0]} µg/m³ PM10`)
          }
        } catch (error) {
          console.error("Error fetching weather/air data:", error);
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

          <div className="text-gray-600 text-left flex flex-col sm:flex-1 justify-center">
            <div className="text-xl font-semibold">{currentTime}</div>
            <span className="text-gray-500 text-[12px] sm:text-sm">
              {currentDate}
            </span>
            <BirthdayIndicator />
          </div>

          <h1 className="text-2xl font-bold text-primary sm:block hidden sm:flex-1 text-center">
            Dzisiaj v3
          </h1>
          <div className="flex-1">
            {currentTemp != null &&
              dailyMin != null &&
              dailyMax != null &&
              weatherCode != null && (
                loading ? <LoadingState /> :
                <div onClick={() => router.push("/weather")} className="flex flex-col flex-1 items-left text-gray-700">
                  <div className={`${airQuality ? 'text-lg' : 'text-xl'} flex items-center font-semibold justify-end space-x-1`}>
                    <WeatherIcon code={weatherCode} />
                    <span className={`${airQuality ? 'text-lg' : 'text-xl'} text-gray-600`}>{currentTemp}°C</span>
                  </div>
                  {airQuality ? (
                  <>
                  <span className="text-gray-600 text-[11px] sm:text-sm ml-5 text-right">
                    min {dailyMin}° · max {dailyMax}°
                  </span>
                  <span className="text-red-700 text-[11px] sm:text-sm ml-5 text-right">
                    {airQuality}
                  </span>
                  </>
                  ) : (
                    <span className="text-gray-600 text-[12px] sm:text-sm ml-5 text-right">
                      min {dailyMin}° · max {dailyMax}°
                    </span>
                  )
                  }
                </div>
              )}
              </div>

    </header>
  );
}
