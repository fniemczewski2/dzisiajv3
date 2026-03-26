import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import PackingList from "../../components/packing/PackingList";
import { BACKPACK, SAFETY, SUITCASE } from "../../config/packing";

export default function DynamicPackingPage() {
  const router = useRouter();
  const { id } = router.query;

  const listData = useMemo(() => {
    switch (id) {
      case "backpack":
        return { pageTitle: "Plecak – Dzisiaj", headerTitle: "Plecak", categories: BACKPACK };
      case "safety":
        return { pageTitle: "Plecak Bezpieczeństwa – Dzisiaj", headerTitle: "Plecak Bezpieczeństwa", categories: SAFETY };
      case "suitcase":
        return { pageTitle: "Walizka – Dzisiaj", headerTitle: "Walizka", categories: SUITCASE };
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
    <PackingList 
      pageTitle={listData.pageTitle} 
      headerTitle={listData.headerTitle} 
      categories={listData.categories} 
      onBack={() => router.push("/packing")}
    />
  );
}