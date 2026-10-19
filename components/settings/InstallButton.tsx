// components/settings/InstallButton.tsx

import { Download } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const subscribeNoop = () => () => {};

/** iPhone/iPad poza trybem „dodano do ekranu początkowego” – tam instalacja jest ręczna. */
function readIosNotInstalled(): boolean {
  const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const standalone = "standalone" in navigator && Boolean((navigator as NavigatorWithStandalone).standalone);
  return ios && !standalone;
}

export default function InstallPromptButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = useSyncExternalStore(subscribeNoop, readIosNotInstalled, () => false);
  // Przycisk: gdy przeglądarka zaproponowała instalację albo na iOS (instrukcja przez „Udostępnij”).
  const showInstallButton = !installed && (deferredPrompt !== null || isIOS);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    globalThis.addEventListener("beforeinstallprompt", handler);
    return () => globalThis.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setInstalled(true);
    } else if (isIOS) {
      try {
        if (navigator.share) {
          await navigator.share({ title: "Dzisiaj", url: window.location.href });
        }
      } catch {
        // Użytkownik zamknął okno udostępniania – nic do zrobienia.
      }
    }
  };

  if (!showInstallButton) return null;

  return (
    <button
      onClick={handleInstall}
      type="button"
      className="flex w-fit items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 font-bold text-white shadow-sm transition-all hover:bg-secondary-hover hover:shadow sm:w-auto"
    >
      <span>Zainstaluj</span>
      <Download className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
