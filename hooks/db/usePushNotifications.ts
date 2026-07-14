// hooks/usePushNotifications.ts

'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import urlBase64ToUint8Array from '@/lib/urlBase64ToUint8Array'
import { useToast } from '@/providers/ToastProvider'

export function usePushNotifications(userId: string | undefined) {
  const { supabase } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const { toast } = useToast();
  useEffect(() => {
    let toastId: string | undefined;
    if (loading  && toast.loading) toastId = toast.loading("Ładowanie powiadomień...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [loading, toast]);

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
          setLoading(false);
        } catch {
          console.error('[SW] Rejestracja nie powiodła się');
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

  async function subscribeToPush() {
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

      const { data: allSubs, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) throw fetchError

      const existing = (allSubs as any[])?.find((sub) => {
        const subData =
          typeof sub.subscription === 'string'
            ? JSON.parse(sub.subscription)
            : sub.subscription
        return subData.endpoint === endpoint
      })

      if (existing) {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            subscription: subscriptionJSON,
            user_agent: navigator.userAgent,
            last_used: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: userId,
            subscription: subscriptionJSON,
            user_agent: navigator.userAgent,
          })
        if (error) throw error
      }

      setIsSubscribed(true)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribeFromPush() {
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

        const { data: allSubs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', userId)

        const toDelete = (allSubs as any[])?.find((sub) => {
          const subData =
            typeof sub.subscription === 'string'
              ? JSON.parse(sub.subscription)
              : sub.subscription
          return subData.endpoint === endpoint
        })

        if (toDelete) {
          const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', toDelete.id)
          if (error) throw error
        }
      }

      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  return { isSubscribed, loading, subscribeToPush, unsubscribeFromPush }
}
