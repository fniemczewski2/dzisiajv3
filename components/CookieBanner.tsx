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
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[100] transition-transform animate-in slide-in-from-bottom-full duration-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-textSecondary text-center sm:text-left">
          Ta strona korzysta z ciasteczek (cookies) oraz podobnych technologii niezbędnych do działania aplikacji (np. autoryzacja sesji). 
          Więcej informacji znajdziesz w naszej{' '}
          <Link href="/privacy" className="text-primary hover:text-secondary hover:underline font-bold transition-colors">
            Polityce Prywatności
          </Link>.
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={acceptCookies}
            className="w-full sm:w-auto px-6 py-2.5 hover:bg-primary bg-secondary text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            Rozumiem i akceptuję
          </button>
        </div>
      </div>
    </div>
  );
}