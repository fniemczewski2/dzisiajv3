import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Header() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<string>('Ładowanie...');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
      const data = await res.json();
      setWeather(`${data.current_weather.temperature}°C`);
    });
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Dzisiaj v3 - {time.toLocaleDateString()}</title>
      </Head>
      <header className="bg-white shadow p-4 flex flex-wrap justify-between items-center">
        <h1 className="text-2xl font-bold">Dzisiaj v3</h1>
        <div className="text-sm">
          {time.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}{' '}
          {time.toLocaleTimeString('pl-PL')}
        </div>
        <div className="text-sm">Pogoda: {weather}</div>
      </header>
    </>
  );
}