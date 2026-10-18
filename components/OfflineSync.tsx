// components/OfflineSync.tsx
//
// Wysyła zapisy z kolejki offline zalogowanej osoby: po starcie aplikacji
// i po każdym odzyskaniu połączenia. Wynik ogłasza toastem, a listy, których
// dotyczyły zapisy, odświeżają się po zdarzeniu OFFLINE_SYNCED_EVENT.

import { useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { flushQueue } from "@/lib/offlineQueue";
import { OFFLINE_SYNCED_EVENT } from "@/config/storage";

export default function OfflineSync() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const running = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const sync = async () => {
      if (running.current || !navigator.onLine) return;
      running.current = true;
      try {
        const { sent, dropped } = await flushQueue(supabase, userId);
        if (sent > 0) {
          toast.success(
            sent === 1 ? "Wysłano zapis wykonany bez sieci." : `Wysłano zapisy wykonane bez sieci: ${sent}.`
          );
          globalThis.dispatchEvent(new CustomEvent(OFFLINE_SYNCED_EVENT));
        }
        if (dropped > 0) {
          toast.error(
            dropped === 1
              ? "Jednego zapisu wykonanego bez sieci nie udało się zapisać – dodaj go ponownie."
              : `Nie udało się zapisać ${dropped} zapisów wykonanych bez sieci – dodaj je ponownie.`
          );
        }
      } finally {
        running.current = false;
      }
    };

    const onOnline = () => {
      void sync();
    };
    onOnline();
    globalThis.addEventListener("online", onOnline);
    return () => globalThis.removeEventListener("online", onOnline);
  }, [userId, supabase, toast]);

  return null;
}
