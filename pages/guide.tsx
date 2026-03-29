import React from 'react';
import Seo from '../components/SEO';
import { BookOpen } from 'lucide-react';
import { guideSections } from '../config/guideData';

export default function GuidePage() {

  return (
    <>
     <Seo
        title="Przewodnik - Dzisiaj v3"
        description="Instrukcje, porady i wskazówki, jak w pełni wykorzystać potencjał aplikacji Dzisiaj v3."
        canonical="https://dzisiajv3.vercel.app/guide"
        keywords="przewodnik, pomoc, instrukcja obsługi, tutorial, faq"
      />
        <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0 mb-10">
          
          <div className="mb-8 text-center sm:text-left mt-4">
            <h1 className="text-3xl font-bold text-text flex items-center justify-center sm:justify-start gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              Instrukcja
            </h1>
            <p className="text-textSecondary mt-2">
              Poznaj wszystkie możliwości, moduły oraz ukryte funkcje Twojego osobistego asystenta.
            </p>
          </div>

          {guideSections.map((section) => (
            <section key={section.id} className="bg-surface border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold text-text flex items-center gap-2 mb-4">
                <span className={section.iconColorClass}>{section.mainIcon}</span>
                {section.title}
              </h2>
              
              <ul className="space-y-3 text-textSecondary list-none marker:text-primary">
                {section.listItems.map((item) => (
                  <li key={`guide-${item}`} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </section>
          ))}

        </div>
    </>
  );
}
