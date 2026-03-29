import React from "react";
import { Backpack, Briefcase, Siren } from "lucide-react";
import { useRouter } from "next/router";
import Seo from "../../components/SEO";

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
        title="Pakowanie - Dzisiaj v3"
        description="Zaplanuj swój bagaż przed podróżą. Generuj wygodne listy rzeczy do spakowania."
        canonical="https://dzisiajv3.vercel.app/packing"
        keywords="pakowanie, lista rzeczy na wyjazd, bagaż, podróże, wakacje"
      />
        <div className="w-full flex items-center mb-6">
          <h2 className="font-bold text-xl text-text mx-auto text-center capitalize tracking-wide">
            Wybierz listę
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {lists.map((list) => {
            const Icon = list.icon;
            return (
              <button
                key={list.id}
                onClick={() => router.push(`/packing/${list.id}`)}
                className="card rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-surfaceHover transition-all hover:scale-[1.02] border border-transparent hover:border-primary/20"
              >
                <div className={`p-4 rounded-full bg-blue-50 dark:bg-blue-950 text-primary`}>
                  <Icon className="w-8 h-8" />
                </div>
                <span className="font-bold text-lg text-text text-center">
                  {list.title}
                </span>
              </button>
            );
          })}
        </div>
    </>
  );
}