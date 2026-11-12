// components/ui/TurnstileWidget.tsx
//
// Widżet Cloudflare Turnstile w formularzach publicznych. Bez NEXT_PUBLIC_TURNSTILE_SITE_KEY nic nie renderuje,
// a formularz nie wymaga tokenu (zob. TURNSTILE_ENABLED). `resetKey` zmieniony po wysłaniu formularza odnawia
// token: każdy token jest jednorazowy.

import { useEffect, useRef } from "react";
import { publicEnv } from "@/config/env";
import { TURNSTILE_SCRIPT_URL } from "@/config/constants";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "auto";
      language: "pl";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_ENABLED = Boolean(publicEnv.turnstileSiteKey);

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile niedostępny.")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Nie udało się wczytać Turnstile."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface TurnstileWidgetProps {
  /** Token po rozwiązaniu wyzwania; null, gdy wygasł albo wystąpił błąd. */
  onToken: (token: string | null) => void;
  /** Zmiana wartości odnawia wyzwanie (po wysłaniu formularza). */
  resetKey?: number;
}

export default function TurnstileWidget({ onToken, resetKey = 0 }: Readonly<TurnstileWidgetProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const siteKey = publicEnv.turnstileSiteKey;
    const container = containerRef.current;
    if (!siteKey || !container) return;
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetIdRef.current = api.render(container, {
          sitekey: siteKey,
          theme: "auto",
          language: "pl",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey === 0 || !widgetIdRef.current || !window.turnstile) return;
    onTokenRef.current(null);
    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!TURNSTILE_ENABLED) return null;
  return <div ref={containerRef} className="min-h-16.25" />;
}
