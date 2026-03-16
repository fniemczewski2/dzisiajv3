// hooks/usePushNotifications.ts

'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../providers/AuthProvider'

export function usePushNotifications(userId: string | undefined) {
  const { supabase } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/custom-sw.js')
        .then(() => checkSubscription())
        .catch((err) => {
          // SW registration is best-effort — don't crash the app
          console.warn('[usePushNotifications] Service Worker registration failed:', err)
        })
    }
  }, [])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !userId) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      // Check is best-effort — missing subscription is handled gracefully
      console.warn('[usePushNotifications] checkSubscription failed:', err)
    }
  }

  // Throws on failure — PushNotificationManager catches and calls toast.error()
  async function subscribeToPush() {
    if (!userId) throw new Error('Musisz być zalogowany')
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Włącz powiadomienia w ustawieniach przeglądarki')
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

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

  // Throws on failure — PushNotificationManager catches and calls toast.error()
  async function unsubscribeFromPush() {
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}