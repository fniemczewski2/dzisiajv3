// components/settings/InstallButton.tsx

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export default function InstallPromptButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const standalone = "standalone" in navigator && (navigator as NavigatorWithStandalone).standalone;

    setIsIOS(ios);

    if (ios && !standalone) {
      setShowInstallButton(true);
    }

    return () => {
      globalThis.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } else if (isIOS) {
      try {
        if (navigator.share) {
          await navigator.share({ title: "Dzisiaj", url: window.location.href });
        }
      } catch {}
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
      <Download className="h-5 w-5" />
    </button>
  );
}
