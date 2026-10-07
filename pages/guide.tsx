// pages/guide.tsx

import React from "react";
import Link from "next/link";
import Seo from "@/components/ui/SEO";
import { BookOpen } from "lucide-react";
import { guideSections, type GuideSection } from "@/config/guideData";
import { FEATURE_GROUPS, getFeaturesWithStatus, type Feature } from "@/config/features";
import FeatureStatusBadge from "@/components/features/FeatureStatusBadge";

const EXTRA_SECTIONS: Record<string, string[]> = {
  Osobiste: ["water_tracker", "mood_tracker"],
};

const SETTINGS_GROUP = { category: "Ustawienia", summary: "Konto, powiadomienia i lokalizacja", ids: ["system"] };

const sectionById = new Map(guideSections.map((s) => [s.id, s]));
const featureByGuideId = new Map<string, Feature>(
  FEATURE_GROUPS.flatMap((g) => g.features).filter((f) => f.guideId).map((f) => [f.guideId as string, f])
);

const slug = (value: string) =>
  value.toLowerCase().normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").replaceAll('ł', "l").replaceAll(/[^a-z0-9]+/g, "-");

const GROUPS = [
  ...FEATURE_GROUPS.map((group) => {
    const ids = group.features.map((f) => f.guideId).filter((id): id is string => Boolean(id));
    const withExtras = ids.flatMap((id) => (id === "habits" ? [id, ...(EXTRA_SECTIONS[group.category] ?? [])] : [id]));
    return { category: group.category as string, summary: group.summary, ids: withExtras };
  }),
  SETTINGS_GROUP,
].map((group) => ({
  ...group,
  anchor: slug(group.category),
  sections: group.ids.map((id) => sectionById.get(id)).filter((s): s is GuideSection => Boolean(s)),
}));

function GuideCard({ section }: Readonly<{ section: GuideSection }>) {
  const feature = featureByGuideId.get(section.id);
  return (
    <article id={section.id} className="scroll-mt-6 rounded-card border border-line bg-card p-5 sm:p-6 shadow-sm">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-primary [&_svg]:h-5 [&_svg]:w-5">
          {section.mainIcon}
        </span>
        <h3 className="text-lg font-semibold text-text">{section.title}</h3>
        {feature?.status && <FeatureStatusBadge status={feature.status} since={feature.since} />}
      </header>
      {feature?.status && feature.note && (
        <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-sm text-text-secondary">{feature.note}</p>
      )}
      <ul className="space-y-3 text-text-secondary leading-relaxed [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
        {section.listItems.map((item, i) => (
          <li key={`${section.id}-${i}`}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default function GuidePage() {
  const changed = getFeaturesWithStatus();

  return (
    <>
      <Seo
        title="Instrukcja"
        description="Opis modułów aplikacji Dzisiaj.Fun z instrukcjami krok po kroku i wskazówkami."
        canonical="https://dzisiaj.fun/guide"
        keywords="przewodnik, pomoc, instrukcja obsługi, tutorial, faq"
      />
      <div className="max-w-4xl mx-auto px-1 sm:px-2 mb-10">
        <header className="mt-2 mb-6">
          <h1 className="page-title sm:text-4xl flex items-center gap-3">
            <BookOpen aria-hidden="true" className="w-8 h-8 text-primary" />
            Instrukcja
          </h1>
          <p className="text-text-secondary mt-2 max-w-2xl">
            Jak korzystać z każdego modułu. Sekcje ułożone są tak jak w menu aplikacji.
          </p>
        </header>

        <nav aria-label="Spis treści" className="mb-8 -mx-1 flex flex-wrap gap-2">
          {GROUPS.map((group) => (
            <a
              key={group.anchor}
              href={`#${group.anchor}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm font-medium text-text-secondary hover:border-line-strong hover:text-text transition-colors"
            >
              {group.category}
              <span className="text-xs text-text-muted tabular-nums">{group.sections.length}</span>
            </a>
          ))}
        </nav>

        {changed.length > 0 && (
          <section aria-labelledby="guide-news" className="mb-10 rounded-card border border-line bg-card p-5 sm:p-6 shadow-sm">
            <h2 id="guide-news" className="font-display text-xl font-bold text-text mb-4">Co nowego</h2>
            <ul className="divide-y divide-line">
              {changed.map((feature) => (
                <li key={feature.title} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    {feature.guideId ? (
                      <Link href={`#${feature.guideId}`} className="font-semibold text-primary hover:text-primary-strong underline-offset-4 hover:underline">
                        {feature.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-text">{feature.title}</span>
                    )}
                    <p className="text-sm text-text-secondary">{feature.note ?? feature.description}</p>
                  </div>
                  <FeatureStatusBadge status={feature.status!} since={feature.since} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-12">
          {GROUPS.map((group) => (
            <section key={group.anchor} id={group.anchor} aria-labelledby={`${group.anchor}-title`} className="scroll-mt-6">
              <div className="mb-4">
                <h2 id={`${group.anchor}-title`} className="font-display text-2xl font-bold text-text">{group.category}</h2>
                <p className="text-sm text-text-muted">{group.summary}</p>
              </div>
              <div className="space-y-4">
                {group.sections.map((section) => (
                  <GuideCard key={section.id} section={section} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
