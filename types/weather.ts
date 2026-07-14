export interface WeatherData {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    is_day?: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    windspeed_10m: number[];
    uv_index: number[];
    weathercode: number[];
    pressure_msl: number[];
    relative_humidity_2m: number[];
    winddirection_10m: number[];
  };
  daily: {
    time: string[];
    apparent_temperature_min: number[];
    apparent_temperature_max: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
  };
}

export interface AirQualityData {
  hourly: {
    time: string[];
    pm10: number[];
    pm2_5: number[];
  };
}

export interface WeatherState {
  forecast: WeatherData | null;
  air: AirQualityData | null;
  loading: boolean;
  error: string | null;
}

export interface HourlyRow {
  time: string;
  temp: number;
  precip: number;
  wind: number;
  uv: number;
  index: number;
}