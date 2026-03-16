"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

export default function InstallPromptButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const standalone =
      "standalone" in navigator && (navigator as any).standalone;

    setIsIOS(ios);

    if (ios && !standalone) {
      setShowInstallButton(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
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

  // Previously: `if (showInstallButton) return null` — always hid the button.
  if (!showInstallButton) return null;

  return (
    <button
      onClick={handleInstall}
      className="px-4 py-2 flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-white font-bold rounded-xl shadow-sm hover:shadow transition-all w-fit sm:w-auto"
    >
      <span>Zainstaluj</span>
      <Download className="w-5 h-5" />
    </button>
  );
}