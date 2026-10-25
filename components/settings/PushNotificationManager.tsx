// components/settings/PushNotificationManager.tsx

import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { useIsClient } from "@/hooks/useIsClient";
import React, { useState } from "react";
import { Bell, BellOff, CheckCircle2, AlertCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/db/usePushNotifications";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import NotificationPreferences from "./NotificationPreferencesForm";

import { describePushTestResult, describePushHttpError } from "@/lib/pushTestResult";
import { SecondaryFullButton } from "../ui/CommonButtons";
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PushNotificationManagerProps {
  readonly userId?: string;
}

type Platform = "ios" | "android" | "desktop";

const getPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
};

const checkIsStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  const matchMediaMatches =
    typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone = (globalThis.navigator as NavigatorWithStandalone)?.standalone === true;
  return matchMediaMatches || navigatorStandalone;
};

const checkIsSupported = (): boolean => {
  return (
    typeof globalThis !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in globalThis.navigator &&
    "PushManager" in globalThis &&
    "Notification" in globalThis
  );
};

function DetailRow({
  label,
  value,
  ok,
  warn = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly ok: boolean;
  readonly warn?: boolean;
}) {
  let colorClass = "bg-danger-soft text-danger border-danger-line ";

  if (ok) {
    colorClass = "bg-success-soft text-success border-success-line ";
  } else if (warn) {
    colorClass = "bg-warning-soft text-warning border-warning-line ";
  }

  return (
    <div className="flex items-center justify-between border-t border-line pt-2 text-xs sm:text-sm">
      <span className="font-semibold text-text-secondary">{label}</span>
      <span className={`rounded-lg border px-2 py-1 font-bold ${colorClass}`}>{value}</span>
    </div>
  );
}

function TechDetailsInfo({
  platform,
  isStandalone,
  isSupported,
  permission,
  isSubscribed,
}: {
  readonly platform: string;
  readonly isStandalone: boolean;
  readonly isSupported: boolean;
  readonly permission: NotificationPermission;
  readonly isSubscribed: boolean;
}) {
  const permissionMap: Record<string, string> = {
    granted: "Przyznane",
    denied: "Odrzucone",
  };
  const permissionText = permissionMap[permission as string] || "Pytaj";

  const platformMap: Record<string, string> = {
    ios: "iOS",
    android: "Android",
  };
  const platformLabel = platformMap[platform] || "Desktop";

  return (
    <div className="mb-5 space-y-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="font-semibold text-text-secondary">Platforma:</span>
        <div className="flex gap-2">
          <span className="card px-2 py-1 font-medium text-text">{platformLabel}</span>
          {isStandalone && (
            <span className="rounded-lg border border-success-line bg-success-soft px-2 py-1 font-bold text-success">
              PWA
            </span>
          )}
        </div>
      </div>

      <DetailRow label="Przeglądarka:" value={isSupported ? "Wspierane" : "Brak"} ok={isSupported} />
      <DetailRow
        label="Uprawnienia:"
        value={permissionText}
        ok={permission === "granted"}
        warn={permission === "default"}
      />
      <DetailRow label="Subskrypcja:" value={isSubscribed ? "Aktywna" : "Brak"} ok={isSubscribed} />
    </div>
  );
}

export default function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const mounted = useIsClient();

  const { isSubscribed, loading, subscribeToPush, unsubscribeFromPush } = usePushNotifications(userId);
  const { supabase } = useAuth();
  const { toast } = useToast();

  const [showDetails, setShowDetails] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof globalThis !== "undefined" && "Notification" in globalThis ? Notification.permission : "default"
  );

  if (!mounted) {
    return null;
  }

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
      } else {
        await subscribeToPush();
        if ("Notification" in globalThis) setPermission(Notification.permission);
      }
    } catch {
      toast.error("Błąd powiadomień.");
    }
  };

  const handleTestNotification = async () => {
    try {
      const result = await invokeEdgeFunction(supabase, "send-push", {
        title: "Dzisiaj.Fun | Test",
        message: "To jest powiadomienie testowe z aplikacji Dzisiaj!",
        url: "/",
      });

      if (!result.ok && result.networkError) {
        // Błąd sieci lub CORS – zwykle niewdrożona funkcja albo brak połączenia.
        toast.error("Brak połączenia z funkcją send-push. Sprawdź internet i czy funkcja jest wdrożona w Supabase.");
        return;
      }
      if (!result.ok) {
        toast.error(
          describePushHttpError(result.status ?? 0, result.data as { error?: string; message?: string } | null)
        );
        return;
      }

      const outcome = describePushTestResult(result.data);
      if (outcome.ok) toast.success(outcome.message);
      else toast.error(outcome.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się wysłać powiadomienia testowego.", {
        cause: error,
      });
    }
  };

  return (
    <div className="card mb-4 p-4 shadow-sm transition-colors sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-text">
          <h3 className="text-lg font-bold">Powiadomienia</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          type="button"
          className="text-xs font-bold text-primary transition-colors hover:text-primary-strong"
        >
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
          <SecondaryFullButton onClick={handleRequestPermission} disabled={loading} Icon={AlertCircle}>
            {loading ? "Czekaj..." : "Aktywuj"}
          </SecondaryFullButton>
        )}
        {isSupported && permission === "granted" && (
          <SecondaryFullButton
            onClick={handleToggleNotifications}
            disabled={loading}
            Icon={isSubscribed ? BellOff : Bell}
          >
            {isSubscribed ? "Wyłącz" : "Włącz"}
          </SecondaryFullButton>
        )}
        {isSubscribed && (
          <SecondaryFullButton onClick={handleTestNotification} disabled={loading} Icon={CheckCircle2}>
            Wyślij Test
          </SecondaryFullButton>
        )}
      </div>
    </div>
  );
}
