// components/CookieBanner.tsx

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <section
      aria-label="Informacja o plikach cookie"
      className="fixed inset-x-3 top-3 z-60 mx-auto max-w-lg sm:inset-x-auto sm:right-5 sm:top-5 sm:mx-0 sm:max-w-sm rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-secondary leading-relaxed">
          Używamy wyłącznie plików cookie niezbędnych do działania aplikacji, np. do utrzymania sesji logowania.
          Szczegóły znajdziesz w{" "}
          <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline hover:text-primary-strong">
            polityce prywatności
          </Link>.
        </p>
        <button
          onClick={acceptCookies}
          type="button"
          className="self-end shrink-0 min-h-11 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-sm font-semibold transition-colors"
        >
          Rozumiem
        </button>
      </div>
    </section>
  );
}
