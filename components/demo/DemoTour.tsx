// components/demo/DemoTour.tsx
//
// Przewodnik krok po kroku po funkcjach aplikacji. Nawigacja przyciskami (obsługa klawiaturą natywna),
// numer kroku ogłaszany na żywo, „Wypróbuj” prowadzi przez logowanie do strony.

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FeatureStatusBadge from "@/components/features/FeatureStatusBadge";
import { buildDemoSteps, tryHref, type DemoStep } from "@/lib/demoTour";

const PRIMARY =
  "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-secondary px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-secondary-hover";
const SECONDARY =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-card px-6 py-3 font-semibold text-text transition-colors hover:bg-surface";

interface DemoTourProps {
  steps?: DemoStep[];
}

export default function DemoTour({ steps = buildDemoSteps() }: Readonly<DemoTourProps>) {
  const [index, setIndex] = useState(0);
  const count = steps.length;
  const step = steps[index];
  if (!step) return null;

  const go = (next: number) => setIndex(Math.min(count - 1, Math.max(0, next)));
  const Icon = step.icon;

  return (
    <section aria-roledescription="przewodnik" aria-label="Przewodnik po funkcjach" className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
        <span>{step.category}</span>
        <span aria-live="polite">
          Krok {index + 1} z {count}
        </span>
      </div>

      <progress className="h-1.5 w-full accent-primary" value={index + 1} max={count} aria-label="Postęp przewodnika" />

      <article className="card space-y-3 p-5">
        <header className="flex items-start gap-3">
          <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <h2 className="section-title flex flex-wrap items-center gap-2">
              {step.title}
              {step.status && <FeatureStatusBadge status={step.status} />}
            </h2>
          </div>
        </header>
        <p className="leading-relaxed text-text-secondary">{step.description}</p>
        {step.note && <p className="text-sm text-text-secondary">{step.note}</p>}
        {step.path && (
          <Link
            href={tryHref(step.path)}
            className="inline-flex font-semibold text-primary underline-offset-4 hover:underline"
          >
            Wypróbuj: {step.title}
          </Link>
        )}
      </article>

      <nav aria-label="Nawigacja przewodnika" className="flex gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className={`${SECONDARY} flex-1 disabled:opacity-50`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Wstecz
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === count - 1}
          className={`${PRIMARY} flex-1 disabled:opacity-50`}
        >
          Dalej
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    </section>
  );
}
