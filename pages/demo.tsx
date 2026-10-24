// pages/demo.tsx

import React from "react";
import Link from "next/link";
import Seo from "@/components/ui/SEO";
import DemoTour from "@/components/demo/DemoTour";
import { DEMO_QUICK_START } from "@/lib/demoTour";

export default function DemoPage() {
  return (
    <>
      <Seo
        title="Demo – Dzisiaj.Fun"
        description="Przewodnik po Dzisiaj.Fun: pierwsze kroki i wszystkie funkcje krok po kroku. Bez logowania."
        canonical="https://dzisiaj.fun/demo"
        keywords="demo aplikacja, instrukcja, przewodnik, Dzisiaj.Fun"
      />
      <div className="mx-auto max-w-3xl space-y-10 px-2 py-8">
        <header className="space-y-3 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text md:text-4xl">
            Demo: poznaj Dzisiaj.Fun
          </h1>
          <p className="text-lg text-text-secondary">
            Przejdź przez funkcje aplikacji. Ta strona nie wymaga konta i niczego nie zapisuje.
          </p>
        </header>

        <section aria-labelledby="quick-start-heading" className="space-y-3">
          <h2 id="quick-start-heading" className="section-title">
            Pierwsze kroki
          </h2>
          <ol className="list-decimal space-y-2 pl-6 text-text-secondary">
            {DEMO_QUICK_START.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="tour-heading" className="space-y-3">
          <h2 id="tour-heading" className="section-title">
            Funkcje krok po kroku
          </h2>
          <DemoTour />
        </section>

        <footer className="space-y-3 text-center">
          <Link
            href="/start"
            className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-secondary px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-secondary-hover"
          >
            Przejdź do logowania
          </Link>
          <p className="text-sm text-text-secondary">
            Pełna lista funkcji:{" "}
            <Link href="/guide" className="text-primary underline">
              przewodnik
            </Link>
            .
          </p>
        </footer>
      </div>
    </>
  );
}
