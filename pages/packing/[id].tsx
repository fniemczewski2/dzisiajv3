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
        return { pageTitle: "Plecak", headerTitle: "Plecak", description: "Lista rzeczy do spakowania do plecaka na krótki wyjazd – odhaczaj spakowane rzeczy.", categories: BACKPACK };
      case "safety":
        return { pageTitle: "Plecak bezpieczeństwa", headerTitle: "Plecak bezpieczeństwa", description: "Lista rzeczy do plecaka bezpieczeństwa na wypadek ewakuacji lub sytuacji kryzysowej.", categories: SAFETY };
      case "suitcase":
        return { pageTitle: "Walizka", headerTitle: "Walizka", description: "Lista rzeczy do spakowania do walizki na dłuższy wyjazd – odhaczaj spakowane rzeczy.", categories: SUITCASE };
      case undefined:
        return null;
      default:
        return null;
    }
  }, [id]);

  useEffect(() => {
    if (!listData && router.isReady) {
      void router.push("/packing");
    }
  }, [listData, router.isReady, router]);

  if (!listData) return null;

  return (
    <>
      <Seo
        title={listData.pageTitle}
        description={listData.description}
        canonical={`https://dzisiaj.fun/packing/${String(router.query.id ?? "")}`}
        noindex={true}
      />
      <PackingList 
        headerTitle={listData.headerTitle} 
        categories={listData.categories} 
        onBack={() => router.push("/packing")}
      />
    </>
  );
}