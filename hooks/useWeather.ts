import { useState, useEffect } from 'react';
import { WeatherData, WeatherState, AirQualityData } from '@/types/weather';

export function useWeather() {
  const [state, setState] = useState<WeatherState>({
    forecast: null,
    air: null,
    loading: true, 
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const { signal } = controller;

    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: "Geolokalizacja nie jest wspierana w tym środowisku." 
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
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

          if (!isMounted) return;

          if (!forecastRes.ok || !airRes.ok) {
            throw new Error("Brak danych pogodowych!");
          }

          const forecastJson = (await forecastRes.json()) as WeatherData;
          const airJson = (await airRes.json()) as AirQualityData;

          if (isMounted) {
            setState({
              forecast: forecastJson,
              air: airJson,
              loading: false,
              error: null,
            });
          }
        } catch (error: any) {
          if (error.name === 'AbortError') return; 
          
          if (isMounted) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: "Błąd pobierania danych pogodowych lub jakości powietrza.",
            }));
          }
        }
      },
      () => {
        if (isMounted) {
          setState(prev => ({ ...prev, loading: false, error: "Nie można uzyskać lokalizacji." }));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return state;
}
