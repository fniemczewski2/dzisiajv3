import { useState, useEffect } from "react";

interface NbpResponse {
  table: string;
  currency: string;
  code: string;
  rates: {
    no: string;
    effectiveDate: string;
    mid: number;
  }[];
}

export const useEuroRate = () => {
  const [rate, setRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        // Fetching from NBP API (Table A - average exchange rates)
        const response = await fetch(
          "https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch exchange rate");
        }

        const data: NbpResponse = await response.json();
        const currentRate = data?.rates?.[0]?.mid;

        if (currentRate) {
          setRate(currentRate);
        } else {
          throw new Error("Invalid data format received from NBP");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error fetching Euro rate:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { rate, loading, error };
};