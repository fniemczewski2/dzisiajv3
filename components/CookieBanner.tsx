// components/CookieBanner.tsx

import { DEVICE_LOCAL_STORAGE_KEYS } from "@/config/storage";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

const subscribe = () => () => {};
const readNoticeSeen = () => {
  try {
    return localStorage.getItem(DEVICE_LOCAL_STORAGE_KEYS.cookieNotice) !== null;
  } catch {
    return true;
  }
};

export default function CookieBanner() {
  // Na serwerze i przy hydratacji baner ukryty; w przeglądarce – gdy nie był jeszcze zamknięty.
  const seen = useSyncExternalStore(subscribe, readNoticeSeen, () => true);
  const [dismissed, setDismissed] = useState(false);
  const isVisible = !seen && !dismissed;

  const acceptCookies = () => {
    try {
      localStorage.setItem(DEVICE_LOCAL_STORAGE_KEYS.cookieNotice, "true");
    } catch {
      // Tryb prywatny – baner zniknie do odświeżenia strony.
    }
    setDismissed(true);
  };

  if (!isVisible) return null;

  return (
    <section
      aria-label="Informacja o plikach cookie"
      className="fixed inset-x-3 top-3 z-60 mx-auto max-w-lg animate-in rounded-card border border-line bg-card p-4 shadow-2xl duration-300 fade-in slide-in-from-top-4 sm:inset-x-auto sm:top-5 sm:right-5 sm:mx-0 sm:max-w-sm sm:p-5"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-text-secondary">
          Używamy wyłącznie plików cookie niezbędnych do działania aplikacji, np. do utrzymania sesji logowania.
          Szczegóły znajdziesz w{" "}
          <Link
            href="/privacy"
            className="font-semibold text-primary underline-offset-4 hover:text-primary-strong hover:underline"
          >
            polityce prywatności
          </Link>
          .
        </p>
        <button
          onClick={acceptCookies}
          type="button"
          className="min-h-11 shrink-0 self-end rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary-hover"
        >
          Rozumiem
        </button>
      </div>
    </section>
  );
}
