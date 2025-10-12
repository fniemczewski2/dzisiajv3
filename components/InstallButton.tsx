"use client";

import { useEffect, useState } from "react";

export default function InstallPromptButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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
    setIsStandalone(standalone);

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
          await navigator.share({
            title: "Dzisiaj",
            url: window.location.href,
          });
        } 
      } catch (err) {}
    }
  };

  if (!showInstallButton) return null;

  return (
    <button
      onClick={handleInstall}
      className="px-3 py-1.5 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
    >
      Zainstaluj
    </button>
  );
}
