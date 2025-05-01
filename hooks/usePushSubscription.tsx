import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { urlBase64ToUint8Array } from "../utils/urlBase64ToUint8Array";

// Initialize Supabase client for browser interactions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Registers a service worker, requests push permission, subscribes the user, and saves their subscription.
 * @param enabled Whether notifications are enabled
 * @param userEmail The email of the user (from session or props)
 */
export function usePushSubscription(enabled: boolean, userEmail: string) {
  useEffect(() => {
    // Only proceed if enabled and userEmail is provided
    if (!enabled || !userEmail) return;

    async function registerAndSave() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push not supported in this browser");
        return;
      }

      // 1. Register the service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      // 2. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Push permission denied");
        return;
      }

      // 3. Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      // 4. Save subscription to Supabase using userEmail as unique key
      await supabase.from("push_subscriptions").upsert(
        {
          user_email: userEmail,
          subscription: subscription.toJSON(),
        },
        { onConflict: "user_email" }
      );
    }

    registerAndSave().catch(console.error);
  }, [enabled, userEmail]);
}
