import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import PackingList from "@/components/packing/PackingList";
import { BACKPACK, SAFETY, SUITCASE } from "@/config/packing";
import Seo from "@/components/ui/SEO";

export default function DynamicPackingPage() {
  const router = useRouter();
  const { id } = router.query;

  const listData = useMemo(() => {
    switch (id) {
      case "backpack":
        return { pageTitle: "Plecak | Dzisiaj.Fun", headerTitle: "Plecak", categories: BACKPACK };
      case "safety":
        return { pageTitle: "Plecak Bezpieczeństwa | Dzisiaj.Fun", headerTitle: "Plecak Bezpieczeństwa", categories: SAFETY };
      case "suitcase":
        return { pageTitle: "Walizka | Dzisiaj.Fun", headerTitle: "Walizka", categories: SUITCASE };
      default:
        return null;
    }
  }, [id]);

  useEffect(() => {
    if (!listData && router.isReady) {
      router.push("/packing");
    }
  }, [listData, router.isReady, router]);

  if (!listData) return null;

  return (
    <>
      <Seo 
        title={listData.pageTitle}  description="Spakuj wszystko, co niezbędne." />
              <Seo
                title="Budżet | Dzisiaj.Fun"
                description="Analizuj swoje wydatki, przeglądaj statystyki finansowe i mądrze zaplanuj domowy budżet."
                canonical="https://dzisiaj.fun/bills/budget"
                keywords="budżet domowy, wydatki, oszczędzanie, statystyki finansowe, portfel"
              />
      <PackingList 
        headerTitle={listData.headerTitle} 
        categories={listData.categories} 
        onBack={() => router.push("/packing")}
      />
    </>
  );
}