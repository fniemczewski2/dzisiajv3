// hooks/useWeather.ts
//
// Prognoza i jakość powietrza (Open-Meteo) dla bieżącej lokalizacji. TanStack
// Query: nagłówek i strona pogody dzielą jedno zapytanie, a dane są świeże
// przez WEATHER_STALE_MS (zapytanie dla tej samej, zaokrąglonej lokalizacji).

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AirQualityData, WeatherData, WeatherState } from "@/types/weather";
import { requestSmartLocation } from "@/lib/locationUtils";
import { WEATHER_STALE_MS } from "@/config/timing";

interface Coords {
  latitude: number;
  longitude: number;
}

async function fetchWeather(
  coords: Coords,
  signal: AbortSignal
): Promise<{ forecast: WeatherData; air: AirQualityData }> {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", coords.latitude.toString());
  forecastUrl.searchParams.set("longitude", coords.longitude.toString());
  forecastUrl.searchParams.set("current_weather", "true");
  forecastUrl.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,windspeed_10m,uv_index,weathercode,pressure_msl,relative_humidity_2m,winddirection_10m"
  );
  forecastUrl.searchParams.set(
    "daily",
    "apparent_temperature_min,apparent_temperature_max,temperature_2m_max,temperature_2m_min,weathercode,uv_index_max,sunrise,sunset,precipitation_sum"
  );
  forecastUrl.searchParams.set("timezone", "auto");
  forecastUrl.searchParams.set("forecast_days", "6");

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.searchParams.set("latitude", coords.latitude.toString());
  airUrl.searchParams.set("longitude", coords.longitude.toString());
  airUrl.searchParams.set("hourly", "pm10,pm2_5");
  airUrl.searchParams.set("timezone", "auto");

  const [forecastRes, airRes] = await Promise.all([
    fetch(forecastUrl.toString(), { signal }),
    fetch(airUrl.toString(), { signal }),
  ]);
  if (!forecastRes.ok || !airRes.ok) throw new Error("Brak danych pogodowych!");
  return {
    forecast: (await forecastRes.json()) as WeatherData,
    air: (await airRes.json()) as AirQualityData,
  };
}

export function useWeather(): WeatherState {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    requestSmartLocation({
      maxAgeMs: 30 * 60 * 1000,
      highAccuracy: false,
      onSuccess: (position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      onError: () => setLocationError("Nie można uzyskać lokalizacji."),
    });
  }, []);

  const query = useQuery({
    // Zaokrąglenie do ~1 km – drobne zmiany pozycji nie wymuszają nowego zapytania.
    queryKey: ["weather", coords?.latitude.toFixed(2) ?? null, coords?.longitude.toFixed(2) ?? null],
    enabled: coords !== null,
    staleTime: WEATHER_STALE_MS,
    queryFn: ({ signal }) => fetchWeather(coords as Coords, signal),
  });

  const geolocationSupported = typeof navigator === "undefined" || Boolean(navigator.geolocation);
  if (!geolocationSupported) {
    return { forecast: null, air: null, loading: false, error: "Geolokalizacja nie jest wspierana w tym środowisku." };
  }
  if (locationError) return { forecast: null, air: null, loading: false, error: locationError };
  if (query.error) {
    return {
      forecast: query.data?.forecast ?? null,
      air: query.data?.air ?? null,
      loading: false,
      error: "Błąd pobierania danych pogodowych lub jakości powietrza.",
    };
  }
  return {
    forecast: query.data?.forecast ?? null,
    air: query.data?.air ?? null,
    loading: !query.data,
    error: null,
  };
}
