"use client";

import React, { useState } from "react";
import { Bell, BellOff, CheckCircle, AlertCircle } from "lucide-react";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useToast } from "../../providers/ToastProvider";
import NotificationPreferences from "./NotificationPreferencesForm";

interface PushNotificationManagerProps {
  readonly userId?: string;
}

const getPlatform = (): string => {
  if (typeof globalThis === "undefined" || !globalThis.navigator) return "desktop";
  const ua = globalThis.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
};

const checkIsStandalone = (): boolean => {
  if (typeof globalThis === "undefined") return false;
  const matchMediaMatches = typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone = (globalThis.navigator as any)?.standalone === true;
  return matchMediaMatches || navigatorStandalone;
};

const checkIsSupported = (): boolean => {
  return (
    typeof globalThis !== "undefined" &&
    globalThis.navigator !== undefined &&
    "serviceWorker" in globalThis.navigator &&
    "PushManager" in globalThis &&
    "Notification" in globalThis
  );
};

function DetailRow({ label, value, ok, warn = false }: { readonly label: string; readonly value: string; readonly ok: boolean; readonly warn?: boolean }) {
  const colorClass = ok 
    ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30"
    : warn 
    ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-700/50"
    : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50";

  return (
    <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
      <span className="font-semibold text-textSecondary">{label}</span>
      <span className={`px-2 py-1 rounded font-bold uppercase tracking-wide border ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}

function TechDetailsInfo({
  platform,
  isStandalone,
  isSupported,
  permission,
  isSubscribed
}: {
  readonly platform: string;
  readonly isStandalone: boolean;
  readonly isSupported: boolean;
  readonly permission: NotificationPermission;
  readonly isSubscribed: boolean;
}) {
  const permissionText = permission === "granted" ? "Przyznane" : permission === "denied" ? "Odrzucone" : "Pytaj";

  return (
    <div className="bg-surface border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-5 space-y-3">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="font-semibold text-textSecondary">Platforma:</span>
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded card text-text font-medium uppercase">
            {platform === "ios" ? "iOS" : platform === "android" ? "Android" : "Desktop"}
          </span>
          {isStandalone && (
            <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-500/30 uppercase">
              PWA
            </span>
          )}
        </div>
      </div>
      
      <DetailRow label="Przeglądarka:" value={isSupported ? "Wspierane" : "Brak"} ok={isSupported} />
      <DetailRow label="Uprawnienia:" value={permissionText} ok={permission === "granted"} warn={permission === "default"} />
      <DetailRow label="Subskrypcja:" value={isSubscribed ? "Aktywna" : "Brak"} ok={isSubscribed} />
    </div>
  );
}

export default function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const { isSubscribed, loading, subscribeToPush, unsubscribeFromPush } = usePushNotifications(userId);
  const { toast } = useToast();

  const [showDetails, setShowDetails] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof globalThis !== "undefined" && "Notification" in globalThis ? Notification.permission : "default"
  );

  const platform = getPlatform();
  const isStandalone = checkIsStandalone();
  const isSupported = checkIsSupported();

  const handleRequestPermission = async () => {
    if (!isSupported) {
      toast.error("Powiadomienia Push nie są wspierane w tej przeglądarce.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Uprawnienia przyznane! Teraz możesz włączyć powiadomienia.");
      } else if (result === "denied") {
        toast.error("Uprawnienia odrzucone. Włącz powiadomienia w ustawieniach przeglądarki.");
      }
    } catch {
      toast.error("Nie udało się poprosić o uprawnienia.");
    }
  };

  const handleToggleNotifications = async () => {
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
        toast.success("Powiadomienia wyłączone.");
      } else {
        await subscribeToPush();
        toast.success("Powiadomienia włączone.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd powiadomień.");
    }
  };

  const handleTestNotification = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !supabaseKey) throw new Error("Błąd konfiguracji Supabase");

      const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title: "Dzisiaj v3 | Test",
          message: "To jest powiadomienie testowe z aplikacji Dzisiaj!",
          url: "/",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Błąd wysyłki: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      toast.success(`Powiadomienie wysłano (${data.sent || 0} / ${data.total || 0})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się wysłać powiadomienia testowego.");
    }
  };

  return (
    <div className="card rounded-xl shadow-sm p-4 sm:p-6 mb-4 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-text">
          <div><Bell className="w-5 h-5 text-primary flex-shrink-0" /></div>
          <h3 className="text-lg font-bold">Powiadomienia</h3>
        </div>
        <button onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary transition-colors">
          {showDetails ? "Ukryj tech." : "Techniczne"}
        </button>
      </div>

      {showDetails && (
        <TechDetailsInfo 
          platform={platform} 
          isStandalone={isStandalone} 
          isSupported={isSupported} 
          permission={permission} 
          isSubscribed={isSubscribed} 
        />
      )}

      <NotificationPreferences />

      <div className="flex flex-wrap gap-3 pt-2">
        {isSupported && permission === "default" && (
          <button onClick={handleRequestPermission} disabled={loading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-secondary transition-colors disabled:opacity-50">
            {loading ? "Czekaj..." : "Nadaj Uprawnienia"}
            <AlertCircle className="w-5 h-5" />
          </button>
        )}
        {isSupported && permission === "granted" && (
          <button onClick={handleToggleNotifications} disabled={loading}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 ${
              isSubscribed
                ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                : "bg-primary hover:bg-secondary text-white"
            }`}>
            {loading ? "Czekaj..." : isSubscribed ? <><span>Wyłącz</span><BellOff className="w-5 h-5" /></> : <><span>Aktywuj</span><Bell className="w-5 h-5" /></>}
          </button>
        )}
        {isSubscribed && (
          <button onClick={handleTestNotification} disabled={loading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-text font-bold rounded-lg transition-colors disabled:opacity-50">
            Wyślij Test <CheckCircle className="w-5 h-5 text-green-500" />
          </button>
        )}
      </div>
    </div>
  );
}