// pages/health.tsx
//
// Zdrowie: sen (fazy) i tętno (rejestr pomiarów) z Apple Zdrowie, dzień po dniu. Kroki i treningi są w module Trening.
// Dane tylko przy aktualnej zgodzie (art. 9 RODO) i tylko w pamięci przeglądarki.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Seo from "@/components/ui/SEO";
import NoResultsState from "@/components/ui/NoResultsState";
import HealthDateNav from "@/components/health/HealthDateNav";
import SleepSection from "@/components/health/SleepSection";
import HeartRateSection from "@/components/health/HeartRateSection";
import { useHealthConsent } from "@/hooks/useHealthConsent";
import { useHealthDays, useHeartRateDay, useSleepNight } from "@/hooks/db/useHealthData";
import { useToast } from "@/providers/ToastProvider";
import { getAppDate } from "@/lib/dateUtils";

export default function HealthPage() {
  const { toast } = useToast();
  const { hasConsent } = useHealthConsent();
  const today = getAppDate();
  const [date, setDate] = useState(today);
  const sleep = useSleepNight(date);
  const heart = useHeartRateDay(date);
  const daily = useHealthDays(date, date);

  const error = sleep.error ?? heart.error ?? daily.error;
  useEffect(() => {
    if (error) toast.error("Nie udało się pobrać danych o zdrowiu.", { cause: error });
  }, [error, toast]);

  return (
    <>
      <Seo title="Zdrowie" description="Sen i tętno z Apple Zdrowie." noindex={true} />
      <div className="space-y-6 pb-20">
        <h1 className="page-title">Zdrowie</h1>
        {hasConsent ? (
          <>
            <HealthDateNav date={date} today={today} onChange={setDate} />
            <SleepSection key={`sleep-${date}`} segments={sleep.data ?? []} date={date} loading={sleep.isLoading} />
            <HeartRateSection key={`heart-${date}`} records={heart.data ?? []} loading={heart.isLoading} />
          </>
        ) : (
          <NoResultsState
            text="danych o zdrowiu"
            hint="Udziel zgody w ustawieniach (Zdrowie ze Skrótów iOS), aby zobaczyć sen i tętno."
            action={
              <Link href="/settings#integracje" className="text-primary underline">
                Przejdź do ustawień
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
