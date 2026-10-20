// pages/packing/index.tsx

import React from "react";
import { Backpack, Briefcase, Siren } from "lucide-react";
import { useRouter } from "next/router";
import Seo from "@/components/ui/SEO";

export default function PackingMenuPage() {
  const router = useRouter();

  const lists = [
    { id: "backpack", title: "Plecak", icon: Backpack },
    { id: "suitcase", title: "Walizka", icon: Briefcase },
    { id: "safety", title: "Plecak Bezpieczeństwa", icon: Siren },
  ];

  return (
    <>
      <Seo
        title="Pakowanie"
        description="Gotowe listy rzeczy do spakowania: plecak, walizka i plecak bezpieczeństwa na sytuacje awaryjne."
        canonical="https://dzisiaj.fun/packing"
        keywords="pakowanie, lista rzeczy na wyjazd, bagaż, podróże, wakacje"
      />
      <div className="mb-6 flex w-full items-center">
        <h1 className="page-title mx-auto text-center first-letter:uppercase">Wybierz listę</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {lists.map((list) => {
          const Icon = list.icon;
          return (
            <button
              key={list.id}
              onClick={() => router.push(`/packing/${list.id}`)}
              type="button"
              className="card flex flex-col items-center justify-center gap-4 border border-transparent p-6 transition-all hover:scale-[1.02] hover:border-primary/20 hover:bg-surface-hover"
            >
              <div className={`rounded-full bg-info-soft p-4 text-primary`}>
                <Icon className="h-8 w-8" />
              </div>
              <span className="text-center text-lg font-bold text-text">{list.title}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
