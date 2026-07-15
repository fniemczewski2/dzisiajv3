// hooks/usePushNotifications.ts

'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import urlBase64ToUint8Array from '@/lib/urlBase64ToUint8Array'
import { useToast } from '@/providers/ToastProvider'
import { useRetry } from '@/lib/withRetry'

export function usePushNotifications(userId: string | undefined) {
  const { supabase } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const { toast } = useToast();
  const withRetry = useRetry();

  useEffect(() => {
    async function initSW() {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          await registration.update();
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch {
          console.error('[SW] Rejestracja nie powiodła się');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }

    if (userId) {
      initSW();
    }
  }, [userId]);

  const subscribeToPush = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Włącz powiadomienia w ustawieniach przeglądarki')
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("Błąd: Brak klucza VAPID w zmiennych środowiskowych.");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subscriptionJSON = subscription.toJSON()
      const endpoint = subscriptionJSON.endpoint

      const { data: allSubs, error: fetchError } = await withRetry(async () =>
        supabase.from('push_subscriptions').select('*').eq('user_id', userId)
      );
      if (fetchError) throw fetchError

      const existing = (allSubs as any[])?.find((sub) => {
        const subData =
          typeof sub.subscription === 'string'
            ? JSON.parse(sub.subscription)
            : sub.subscription
        return subData.endpoint === endpoint
      })

      if (existing) {
        const { error } = await withRetry(async () =>
          supabase
            .from('push_subscriptions')
            .update({
              subscription: subscriptionJSON,
              user_agent: navigator.userAgent,
              last_used: new Date().toISOString(),
            })
            .eq('id', existing.id)
        );
        if (error) throw error
      } else {
        const { error } = await withRetry(async () =>
          supabase.from('push_subscriptions').insert({
            user_id: userId,
            subscription: subscriptionJSON,
            user_agent: navigator.userAgent,
          })
        );
        if (error) throw error
      }

      setIsSubscribed(true)
      toast.success("Włączono powiadomienia push");
    } catch (err: any) {
      toast.error(err?.message || "Błąd włączania powiadomień.");
    } finally {
      setLoading(false)
    }
  }, [userId, supabase, toast, withRetry])

  const unsubscribeFromPush = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.toJSON().endpoint
        await subscription.unsubscribe()

        const { data: allSubs } = await withRetry(async () =>
          supabase.from('push_subscriptions').select('*').eq('user_id', userId)
        );

        const toDelete = (allSubs as any[])?.find((sub) => {
          const subData =
            typeof sub.subscription === 'string'
              ? JSON.parse(sub.subscription)
              : sub.subscription
          return subData.endpoint === endpoint
        })

        if (toDelete) {
          const { error } = await withRetry(async () =>
            supabase.from('push_subscriptions').delete().eq('id', toDelete.id)
          );
          if (error) throw error
        }
      }

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
