// hooks/useEuroRate.ts

import { useState, useEffect } from "react";

interface NbpResponse {
  table: string;
  currency: string;
  code: string;
  rates: { no: string; effectiveDate: string; mid: number }[];
}

export function useEuroRate() {
  const [rate, setRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await fetch(
          "https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json"
        );
        if (!response.ok) {
          throw new Error(`NBP API error: ${response.status}`);
        }

        const data: NbpResponse = await response.json();
        const currentRate = data?.rates?.[0]?.mid;

        if (!currentRate) {
          throw new Error("Nieprawidłowy format odpowiedzi z NBP");
        }

        setRate(currentRate);
      } catch  {
        setError("Wystąpił błąd pobierania kursu.");
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { rate, loading, error };
}