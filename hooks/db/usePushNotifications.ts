// hooks/db/usePushNotifications.ts

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import urlBase64ToUint8Array from '@/lib/urlBase64ToUint8Array'
import { useToast } from '@/providers/ToastProvider'
import { useRetry } from '@/hooks/useRetry'
import { getErrorMessage } from '@/lib/errorUtils'

interface PushSubscriptionRow {
  id: string;
  subscription: string | { endpoint: string };
}

const OPT_IN_KEY = 'dzisiaj:push_opt_in';

function readOptIn(): boolean | null {
  try {
    const value = localStorage.getItem(OPT_IN_KEY);
    return value === null ? null : value === '1';
  } catch {
    return null;
  }
}

function writeOptIn(value: boolean) {
  try {
    localStorage.setItem(OPT_IN_KEY, value ? '1' : '0');
  } catch {
    /* brak dostępu do localStorage */
  }
}

export function usePushNotifications(userId: string | undefined) {
  const { supabase } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const { toast } = useToast();
  const withRetry = useRetry();

  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    if (!userId) throw new Error("Unauthorized");
    const subscriptionJSON = subscription.toJSON();
    const endpoint = subscriptionJSON.endpoint;

    const { data: allSubs, error: fetchError } = await withRetry(() =>
      supabase.from('push_subscriptions').select('*').eq('user_id', userId)
    );
    if (fetchError) throw fetchError;

    const existing = (allSubs as PushSubscriptionRow[])?.find((sub) => {
      const subData = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
      return subData?.endpoint === endpoint;
    });

    const { error } = existing
      ? await withRetry(() =>
          supabase
            .from('push_subscriptions')
            .update({ subscription: subscriptionJSON, user_agent: navigator.userAgent, last_used: new Date().toISOString() })
            .eq('id', existing.id)
        )
      : await withRetry(() =>
          supabase.from('push_subscriptions').insert({ user_id: userId, subscription: subscriptionJSON, user_agent: navigator.userAgent })
        );
    if (error) throw error;
  }, [userId, supabase, withRetry]);

  const createSubscription = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error("Błąd: Brak klucza VAPID w zmiennych środowiskowych.");
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }, []);

  useEffect(() => {
    async function initSW() {
      if (!('serviceWorker' in navigator) || !('PushManager' in globalThis)) {
        setLoading(false);
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await registration.update();
        let subscription = await registration.pushManager.getSubscription();

        const permissionGranted = 'Notification' in globalThis && Notification.permission === 'granted';
        if (!subscription && permissionGranted && readOptIn() === true) {
          subscription = await createSubscription();
        }

        if (subscription && permissionGranted) {
          setIsSubscribed(true);
          writeOptIn(true);
          await saveSubscription(subscription);
        } else {
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        console.error('[SW] Nie udało się odświeżyć subskrypcji push', err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      void initSW();
    }
  }, [userId, createSubscription, saveSubscription]);

  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'PUSH_SUBSCRIPTION_CHANGED') return;
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => (subscription ? saveSubscription(subscription) : undefined))
        .catch((err) => console.error('[SW] Nie zapisano odnowionej subskrypcji', err));
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [userId, saveSubscription]);

  const subscribeToPush = useCallback(async () => {
    if (!userId) throw new Error("Unauthorized");
    setLoading(true);
    try {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Włącz powiadomienia w ustawieniach przeglądarki');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = (await registration.pushManager.getSubscription()) ?? (await createSubscription());
      await saveSubscription(subscription);

      writeOptIn(true);
      setIsSubscribed(true);
      toast.success("Włączono powiadomienia push");
    } catch (err) {
      toast.error(getErrorMessage(err, "Błąd włączania powiadomień."));
    } finally {
      setLoading(false);
    }
  }, [userId, toast, createSubscription, saveSubscription]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!userId) {

      throw new Error("Unauthorized");
    }
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.toJSON().endpoint
        await subscription.unsubscribe()

        const { data: allSubs } = await withRetry(() =>
          supabase.from('push_subscriptions').select('*').eq('user_id', userId)
        );

        const toDelete = (allSubs as PushSubscriptionRow[])?.find((sub) => {
          const subData =
            typeof sub.subscription === 'string'
              ? JSON.parse(sub.subscription)
              : sub.subscription
          return subData.endpoint === endpoint
        })

        if (toDelete) {
          const { error } = await withRetry(() =>
            supabase.from('push_subscriptions').delete().eq('id', toDelete.id)
          );
          if (error) throw error
        }
      }

      writeOptIn(false)
      setIsSubscribed(false)
      toast.success("Wyłączono powiadomienia push");
    } catch {
      toast.error("Błąd wyłączania powiadomień.");
    } finally {
      setLoading(false)
    }
  }, [userId, supabase, toast, withRetry])

  return { isSubscribed, loading, subscribeToPush, unsubscribeFromPush }
}
